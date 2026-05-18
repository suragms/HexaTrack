using System.Text.Json;
using StackExchange.Redis;

namespace HexaTrack.Api.Application.Services;

public sealed record FeatureFlagChangeEvent(
    string Scope,
    string Key,
    Guid? TargetId,
    bool? IsEnabled,
    string? Value,
    DateTimeOffset UpdatedAt);

public interface IFeatureFlagChangeNotifier
{
    Task PublishAsync(FeatureFlagChangeEvent change, CancellationToken cancellationToken);
}

public sealed class FeatureFlagChangeNotifier(IConnectionMultiplexer redis) : IFeatureFlagChangeNotifier
{
    public const string ChannelName = "hexatrack:feature-flags:changed";
    public static RedisChannel Channel => RedisChannel.Literal(ChannelName);

    public Task PublishAsync(FeatureFlagChangeEvent change, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string payload = JsonSerializer.Serialize(change);
        return redis.GetSubscriber().PublishAsync(Channel, payload);
    }
}
