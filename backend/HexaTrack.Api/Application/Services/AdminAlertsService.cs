using Microsoft.EntityFrameworkCore;
using HexaTrack.Api.Domain;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure;

namespace HexaTrack.Api.Application.Services;

public interface IAdminAlertsService
{
    Task ScanAndGenerateAlertsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<AdminAlert>> GetActiveAlertsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<AdminAlert>> GetAlertHistoryAsync(int page, int pageSize, CancellationToken cancellationToken);
    Task ResolveAlertAsync(Guid alertId, string resolvedBy, CancellationToken cancellationToken);
}

public sealed class AdminAlertsService(HexaTrackDbContext db) : IAdminAlertsService
{
    public async Task ScanAndGenerateAlertsAsync(CancellationToken cancellationToken)
    {
        // 1. Locked Accounts Alert Scan
        var lockedUsers = await db.Users.AsNoTracking()
            .Where(u => u.IsLocked)
            .ToListAsync(cancellationToken);

        foreach (var user in lockedUsers)
        {
            var exists = await db.AdminAlerts.AnyAsync(
                x => !x.IsResolved && x.Type == "Security" && x.Message.Contains(user.Email),
                cancellationToken);

            if (!exists)
            {
                db.AdminAlerts.Add(new AdminAlert
                {
                    Type = "Security",
                    Title = "Account Locked",
                    Message = $"Platform User account '{user.Email}' is currently locked due to policy overrides.",
                    Severity = "High",
                    CreatedAt = DateTimeOffset.UtcNow
                });
            }
        }

        // 2. Suspended Organizations Alert Scan
        var suspendedOrgs = await db.Organizations.AsNoTracking()
            .Where(o => o.IsSuspended)
            .ToListAsync(cancellationToken);

        foreach (var org in suspendedOrgs)
        {
            var exists = await db.AdminAlerts.AnyAsync(
                x => !x.IsResolved && x.Type == "Organization" && x.Message.Contains(org.Name),
                cancellationToken);

            if (!exists)
            {
                db.AdminAlerts.Add(new AdminAlert
                {
                    Type = "Organization",
                    Title = "Tenant Suspended",
                    Message = $"Enterprise Organization '{org.Name}' is suspended. All branches and staff ledger connections blocked.",
                    Severity = "Critical",
                    CreatedAt = DateTimeOffset.UtcNow
                });
            }
        }

        // 3. Subscription Expiring Scan
        var expiringSubs = await db.UserSubscriptions.AsNoTracking()
            .Where(s => s.IsActive && s.CurrentPeriodEndsAt != null && s.CurrentPeriodEndsAt <= DateTimeOffset.UtcNow.AddDays(7))
            .ToListAsync(cancellationToken);

        foreach (var sub in expiringSubs)
        {
            var exists = await db.AdminAlerts.AnyAsync(
                x => !x.IsResolved && x.Type == "Billing" && x.Message.Contains(sub.UserId.ToString()),
                cancellationToken);

            if (!exists)
            {
                db.AdminAlerts.Add(new AdminAlert
                {
                    Type = "Billing",
                    Title = "Subscription Expiring",
                    Message = $"Platform user subscription ({sub.Plan}) is expiring within 7 days. Expiry date: {sub.CurrentPeriodEndsAt:d}.",
                    Severity = "Medium",
                    CreatedAt = DateTimeOffset.UtcNow
                });
            }
        }

        // 4. Failed Login Scan (Audit Log entries)
        var recentFailedLogins = await db.AdminAuditLogs.AsNoTracking()
            .Where(x => x.Action.Contains("auth.login.failed") || x.Action.Contains("login.failed"))
            .OrderByDescending(x => x.CreatedAt)
            .Take(10)
            .ToListAsync(cancellationToken);

        foreach (var log in recentFailedLogins)
        {
            var exists = await db.AdminAlerts.AnyAsync(
                x => !x.IsResolved && x.Type == "Security" && x.Message.Contains(log.IpAddress ?? "unknown"),
                cancellationToken);

            if (!exists)
            {
                db.AdminAlerts.Add(new AdminAlert
                {
                    Type = "Security",
                    Title = "Suspicious Login Deflected",
                    Message = $"Failed platform credentials attempt from client IP: '{log.IpAddress ?? "unknown"}' at {log.CreatedAt:g}.",
                    Severity = "High",
                    CreatedAt = DateTimeOffset.UtcNow
                });
            }
        }

        // Save scanned alerts
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AdminAlert>> GetActiveAlertsAsync(CancellationToken cancellationToken)
    {
        // Proactively scan first so real state is always fresh
        await ScanAndGenerateAlertsAsync(cancellationToken);

        return await db.AdminAlerts
            .AsNoTracking()
            .Where(x => !x.IsResolved)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AdminAlert>> GetAlertHistoryAsync(int page, int pageSize, CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        return await db.AdminAlerts
            .AsNoTracking()
            .Where(x => x.IsResolved)
            .OrderByDescending(x => x.ResolvedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }

    public async Task ResolveAlertAsync(Guid alertId, string resolvedBy, CancellationToken cancellationToken)
    {
        var alert = await db.AdminAlerts.FirstOrDefaultAsync(x => x.Id == alertId, cancellationToken);
        if (alert != null)
        {
            alert.IsResolved = true;
            alert.ResolvedBy = resolvedBy;
            alert.ResolvedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
