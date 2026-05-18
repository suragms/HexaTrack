using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Application.Security;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure;
using System.Text;

namespace HexaTrack.Api.Application.Services;

public interface IAdminAuditService
{
    Task LogAsync(Guid actorUserId, string action, string? targetType, Guid? targetId, string? metadataJson, CancellationToken cancellationToken);
    Task<AdminAuditListResult> ListAsync(int page, int pageSize, string? query, string? actionKeyword, string? targetType, CancellationToken cancellationToken);
    Task<byte[]> ExportCsvAsync(string? query, string? actionKeyword, string? targetType, CancellationToken cancellationToken);
}

public sealed class AdminAuditService(HexaTrackDbContext db, IHttpContextAccessor httpContextAccessor) : IAdminAuditService
{
    public async Task LogAsync(Guid actorUserId, string action, string? targetType, Guid? targetId, string? metadataJson, CancellationToken cancellationToken)
    {
        string? ip = ClientIpResolver.Resolve(httpContextAccessor.HttpContext);
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = actorUserId,
            Action = action,
            TargetType = targetType,
            TargetId = targetId,
            MetadataJson = metadataJson,
            IpAddress = ip,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<AdminAuditListResult> ListAsync(
        int page,
        int pageSize,
        string? query,
        string? actionKeyword,
        string? targetType,
        CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 200);

        IQueryable<AdminAuditLog> q = db.AdminAuditLogs
            .Include(x => x.Actor)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var lowerQuery = query.Trim().ToLower();
            q = q.Where(x => x.Action.ToLower().Contains(lowerQuery)
                || (x.IpAddress != null && x.IpAddress.ToLower().Contains(lowerQuery))
                || (x.TargetType != null && x.TargetType.ToLower().Contains(lowerQuery))
                || (x.Actor != null && x.Actor.Email.ToLower().Contains(lowerQuery))
                || (x.Actor != null && x.Actor.DisplayName.ToLower().Contains(lowerQuery)));
        }

        if (!string.IsNullOrWhiteSpace(actionKeyword))
        {
            var lowerAct = actionKeyword.Trim().ToLower();
            q = q.Where(x => x.Action.ToLower().Contains(lowerAct));
        }

        if (!string.IsNullOrWhiteSpace(targetType))
        {
            var lowerTarget = targetType.Trim().ToLower();
            q = q.Where(x => x.TargetType != null && x.TargetType.ToLower() == lowerTarget);
        }

        int total = await q.CountAsync(cancellationToken);

        var rows = await q
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        List<AdminAuditLogDto> items = rows
            .Select(x => new AdminAuditLogDto(
                x.Id,
                x.ActorUserId,
                x.Action,
                x.TargetType,
                x.TargetId,
                x.IpAddress,
                x.CreatedAt,
                ClassifySeverity(x.Action)))
            .ToList();

        return new AdminAuditListResult(items, page, pageSize, total);
    }

    public async Task<byte[]> ExportCsvAsync(
        string? query,
        string? actionKeyword,
        string? targetType,
        CancellationToken cancellationToken)
    {
        IQueryable<AdminAuditLog> q = db.AdminAuditLogs
            .Include(x => x.Actor)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var lowerQuery = query.Trim().ToLower();
            q = q.Where(x => x.Action.ToLower().Contains(lowerQuery)
                || (x.IpAddress != null && x.IpAddress.ToLower().Contains(lowerQuery))
                || (x.TargetType != null && x.TargetType.ToLower().Contains(lowerQuery))
                || (x.Actor != null && x.Actor.Email.ToLower().Contains(lowerQuery)));
        }

        if (!string.IsNullOrWhiteSpace(actionKeyword))
        {
            var lowerAct = actionKeyword.Trim().ToLower();
            q = q.Where(x => x.Action.ToLower().Contains(lowerAct));
        }

        if (!string.IsNullOrWhiteSpace(targetType))
        {
            var lowerTarget = targetType.Trim().ToLower();
            q = q.Where(x => x.TargetType != null && x.TargetType.ToLower() == lowerTarget);
        }

        var list = await q.OrderByDescending(x => x.CreatedAt).ToListAsync(cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("ID,Timestamp,ActorUserID,ActorEmail,Action,TargetType,TargetID,IPAddress");

        foreach (var item in list)
        {
            var email = item.Actor?.Email ?? "system";
            sb.AppendLine($"{item.Id},{item.CreatedAt:o},{item.ActorUserId},{email},\"{item.Action.Replace("\"", "\"\"")}\",\"{item.TargetType?.Replace("\"", "\"\"")}\",\"{item.TargetId}\",\"{item.IpAddress}\"");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static string ClassifySeverity(string action)
    {
        string lower = action.ToLowerInvariant();
        if (lower.Contains("denied", StringComparison.Ordinal) ||
            lower.Contains("failed", StringComparison.Ordinal) ||
            lower.Contains("delete", StringComparison.Ordinal) ||
            lower.Contains("suspend", StringComparison.Ordinal))
        {
            return "High";
        }

        if (lower.Contains("password", StringComparison.Ordinal) ||
            lower.Contains("superadmin", StringComparison.Ordinal) ||
            lower.Contains("featureflag", StringComparison.Ordinal) ||
            lower.Contains("subscription", StringComparison.Ordinal))
        {
            return "Medium";
        }

        return "Info";
    }
}
