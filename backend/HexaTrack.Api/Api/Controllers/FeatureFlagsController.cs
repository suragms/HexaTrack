using System.Text.Json;
using System.Threading.Channels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HexaTrack.Api.Application.Security;
using HexaTrack.Api.Application.Services;
using StackExchange.Redis;

namespace HexaTrack.Api.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/feature-flags")]
public sealed class FeatureFlagsController(
    ICurrentUser currentUser,
    ICurrentWorkspace currentWorkspace,
    IAdminFeatureFlagsService flags,
    IConnectionMultiplexer redis) : ControllerBase
{
    [HttpGet]
    public Task<Dictionary<string, bool>> GetEffective(CancellationToken cancellationToken)
        => flags.GetEffectiveFlagsAsync(currentUser.UserId, currentUser.OrganizationId, currentWorkspace.WorkspaceId, currentUser.BranchId, cancellationToken);

    [HttpGet("stream")]
    public async Task Stream(CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-cache, no-store";
        Response.Headers.Connection = "keep-alive";
        Response.Headers.XContentTypeOptions = "nosniff";
        Response.ContentType = "text/event-stream";

        Dictionary<string, bool> snapshot = await flags.GetEffectiveFlagsAsync(
            currentUser.UserId,
            currentUser.OrganizationId,
            currentWorkspace.WorkspaceId,
            currentUser.BranchId,
            cancellationToken);
        await WriteSseAsync("snapshot", snapshot, cancellationToken);

        // Redis pub/sub for live updates — gracefully degrade when Redis is unavailable
        ISubscriber? subscriber = null;
        try
        {
            subscriber = redis.GetSubscriber();
        }
        catch (Exception)
        {
            // Redis not available — send a close event and return (feature flags still work via snapshot)
            await WriteRawSseAsync("info", "{\"message\":\"Live updates unavailable — Redis not connected\"}", cancellationToken);
            return;
        }

        var queue = Channel.CreateUnbounded<string>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });

        Action<RedisChannel, RedisValue> handler = (_, value) => queue.Writer.TryWrite(value.ToString());

        try
        {
            await subscriber.SubscribeAsync(FeatureFlagChangeNotifier.Channel, handler);
        }
        catch (RedisConnectionException)
        {
            // Redis subscribe failed — send info and close gracefully
            await WriteRawSseAsync("info", "{\"message\":\"Live updates unavailable — Redis not connected\"}", cancellationToken);
            return;
        }

        try
        {
            await foreach (string payload in queue.Reader.ReadAllAsync(cancellationToken))
            {
                await WriteRawSseAsync("updated", payload, cancellationToken);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        finally
        {
            await subscriber.UnsubscribeAsync(FeatureFlagChangeNotifier.Channel, handler);
        }
    }

    private async Task WriteSseAsync<T>(string eventName, T payload, CancellationToken cancellationToken)
    {
        string json = JsonSerializer.Serialize(payload);
        await WriteRawSseAsync(eventName, json, cancellationToken);
    }

    private async Task WriteRawSseAsync(string eventName, string json, CancellationToken cancellationToken)
    {
        await Response.WriteAsync($"event: {eventName}\n", cancellationToken);
        await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }
}
