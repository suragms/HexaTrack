using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure;

namespace HexaTrack.Api.Application.Services;

public interface IAdminFeatureFlagsService
{
    Task<IReadOnlyList<FeatureFlagDto>> ListAsync(CancellationToken cancellationToken);
    Task UpsertAsync(string key, string value, Guid actorUserId, CancellationToken cancellationToken);
    Task<IReadOnlyList<OrganizationFeatureToggleDto>> GetOrgTogglesAsync(Guid organizationId, CancellationToken cancellationToken);
    Task UpsertOrgToggleAsync(Guid organizationId, string key, bool isEnabled, Guid actorUserId, CancellationToken cancellationToken);
    Task<IReadOnlyList<WorkspaceFeatureToggleDto>> GetWorkspaceTogglesAsync(Guid workspaceId, CancellationToken cancellationToken);
    Task UpsertWorkspaceToggleAsync(Guid workspaceId, string key, bool isEnabled, Guid actorUserId, CancellationToken cancellationToken);
    Task<IReadOnlyList<BranchFeatureToggleDto>> GetBranchTogglesAsync(Guid branchId, CancellationToken cancellationToken);
    Task UpsertBranchToggleAsync(Guid branchId, string key, bool isEnabled, Guid actorUserId, CancellationToken cancellationToken);
    Task<IReadOnlyList<UserFeatureToggleDto>> GetUserTogglesAsync(Guid userId, CancellationToken cancellationToken);
    Task UpsertUserToggleAsync(Guid userId, string key, bool isEnabled, Guid actorUserId, CancellationToken cancellationToken);
    Task<Dictionary<string, bool>> GetEffectiveFlagsAsync(Guid userId, Guid? organizationId, Guid? workspaceId, Guid? branchId, CancellationToken cancellationToken);
}

public sealed class AdminFeatureFlagsService(HexaTrackDbContext db, IAdminAuditService audit, IFeatureFlagChangeNotifier notifier) : IAdminFeatureFlagsService
{
    public async Task<IReadOnlyList<FeatureFlagDto>> ListAsync(CancellationToken cancellationToken)
    {
        return await db.GlobalFeatureFlags.AsNoTracking()
            .OrderBy(x => x.Key)
            .Select(x => new FeatureFlagDto(x.Key, x.Value, x.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task UpsertAsync(string key, string value, Guid actorUserId, CancellationToken cancellationToken)
    {
        key = NormalizeFeatureKey(key);
        value = NormalizeFeatureValue(value);

        GlobalFeatureFlag? row = await db.GlobalFeatureFlags.SingleOrDefaultAsync(x => x.Key == key, cancellationToken);
        DateTimeOffset now = DateTimeOffset.UtcNow;
        if (row is null)
        {
            db.GlobalFeatureFlags.Add(new GlobalFeatureFlag { Key = key, Value = value, UpdatedAt = now });
        }
        else
        {
            row.Value = value;
            row.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync(actorUserId, "featureflag.update", "GlobalFeatureFlag", null,
            JsonSerializer.Serialize(new { key, value }), cancellationToken);
        await notifier.PublishAsync(new FeatureFlagChangeEvent("Global", key, null, bool.Parse(value), value, now), cancellationToken);
    }

    public async Task<IReadOnlyList<OrganizationFeatureToggleDto>> GetOrgTogglesAsync(Guid organizationId, CancellationToken cancellationToken)
    {
        return await db.OrganizationFeatureToggles.AsNoTracking()
            .Where(x => x.OrganizationId == organizationId)
            .OrderBy(x => x.FeatureKey)
            .Select(x => new OrganizationFeatureToggleDto(x.Id, x.OrganizationId, x.FeatureKey, x.IsEnabled, x.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task UpsertOrgToggleAsync(Guid organizationId, string key, bool isEnabled, Guid actorUserId, CancellationToken cancellationToken)
    {
        key = NormalizeFeatureKey(key);
        bool exists = await db.Organizations.AnyAsync(x => x.Id == organizationId, cancellationToken);
        if (!exists)
        {
            throw new KeyNotFoundException("Organization not found.");
        }

        OrganizationFeatureToggle? row = await db.OrganizationFeatureToggles
            .SingleOrDefaultAsync(x => x.OrganizationId == organizationId && x.FeatureKey == key, cancellationToken);
        
        DateTimeOffset now = DateTimeOffset.UtcNow;
        if (row is null)
        {
            db.OrganizationFeatureToggles.Add(new OrganizationFeatureToggle
            {
                OrganizationId = organizationId,
                FeatureKey = key,
                IsEnabled = isEnabled,
                UpdatedAt = now
            });
        }
        else
        {
            row.IsEnabled = isEnabled;
            row.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync(actorUserId, "featureflag.org_update", "OrganizationFeatureToggle", organizationId,
            JsonSerializer.Serialize(new { key, isEnabled }), cancellationToken);
        await notifier.PublishAsync(new FeatureFlagChangeEvent("Organization", key, organizationId, isEnabled, null, now), cancellationToken);
    }

    public async Task<IReadOnlyList<UserFeatureToggleDto>> GetUserTogglesAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await db.UserFeatureToggles.AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderBy(x => x.FeatureKey)
            .Select(x => new UserFeatureToggleDto(x.Id, x.UserId, x.FeatureKey, x.IsEnabled, x.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<WorkspaceFeatureToggleDto>> GetWorkspaceTogglesAsync(Guid workspaceId, CancellationToken cancellationToken)
    {
        return await db.WorkspaceFeatureToggles.AsNoTracking()
            .Where(x => x.WorkspaceId == workspaceId)
            .OrderBy(x => x.FeatureKey)
            .Select(x => new WorkspaceFeatureToggleDto(x.Id, x.WorkspaceId, x.FeatureKey, x.IsEnabled, x.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task UpsertWorkspaceToggleAsync(Guid workspaceId, string key, bool isEnabled, Guid actorUserId, CancellationToken cancellationToken)
    {
        key = NormalizeFeatureKey(key);
        bool exists = await db.Workspaces.AnyAsync(x => x.Id == workspaceId, cancellationToken);
        if (!exists)
        {
            throw new KeyNotFoundException("Workspace not found.");
        }

        WorkspaceFeatureToggle? row = await db.WorkspaceFeatureToggles
            .SingleOrDefaultAsync(x => x.WorkspaceId == workspaceId && x.FeatureKey == key, cancellationToken);

        DateTimeOffset now = DateTimeOffset.UtcNow;
        if (row is null)
        {
            db.WorkspaceFeatureToggles.Add(new WorkspaceFeatureToggle { WorkspaceId = workspaceId, FeatureKey = key, IsEnabled = isEnabled, UpdatedAt = now });
        }
        else
        {
            row.IsEnabled = isEnabled;
            row.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync(actorUserId, "featureflag.workspace_update", "WorkspaceFeatureToggle", workspaceId,
            JsonSerializer.Serialize(new { key, isEnabled }), cancellationToken);
        await notifier.PublishAsync(new FeatureFlagChangeEvent("Workspace", key, workspaceId, isEnabled, null, now), cancellationToken);
    }

    public async Task<IReadOnlyList<BranchFeatureToggleDto>> GetBranchTogglesAsync(Guid branchId, CancellationToken cancellationToken)
    {
        return await db.BranchFeatureToggles.AsNoTracking()
            .Where(x => x.BranchId == branchId)
            .OrderBy(x => x.FeatureKey)
            .Select(x => new BranchFeatureToggleDto(x.Id, x.BranchId, x.FeatureKey, x.IsEnabled, x.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task UpsertBranchToggleAsync(Guid branchId, string key, bool isEnabled, Guid actorUserId, CancellationToken cancellationToken)
    {
        key = NormalizeFeatureKey(key);
        bool exists = await db.Branches.AnyAsync(x => x.Id == branchId, cancellationToken);
        if (!exists)
        {
            throw new KeyNotFoundException("Branch not found.");
        }

        BranchFeatureToggle? row = await db.BranchFeatureToggles
            .SingleOrDefaultAsync(x => x.BranchId == branchId && x.FeatureKey == key, cancellationToken);

        DateTimeOffset now = DateTimeOffset.UtcNow;
        if (row is null)
        {
            db.BranchFeatureToggles.Add(new BranchFeatureToggle { BranchId = branchId, FeatureKey = key, IsEnabled = isEnabled, UpdatedAt = now });
        }
        else
        {
            row.IsEnabled = isEnabled;
            row.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync(actorUserId, "featureflag.branch_update", "BranchFeatureToggle", branchId,
            JsonSerializer.Serialize(new { key, isEnabled }), cancellationToken);
        await notifier.PublishAsync(new FeatureFlagChangeEvent("Branch", key, branchId, isEnabled, null, now), cancellationToken);
    }

    public async Task UpdateUserTogglesFromPermissionsAsync(Guid userId, long permissionOverrides, CancellationToken cancellationToken)
    {
        // PermissionOverrides is handled in standard auth
    }

    public async Task UpsertUserToggleAsync(Guid userId, string key, bool isEnabled, Guid actorUserId, CancellationToken cancellationToken)
    {
        key = NormalizeFeatureKey(key);
        bool exists = await db.Users.AnyAsync(x => x.Id == userId, cancellationToken);
        if (!exists)
        {
            throw new KeyNotFoundException("User not found.");
        }

        UserFeatureToggle? row = await db.UserFeatureToggles
            .SingleOrDefaultAsync(x => x.UserId == userId && x.FeatureKey == key, cancellationToken);
        
        DateTimeOffset now = DateTimeOffset.UtcNow;
        if (row is null)
        {
            db.UserFeatureToggles.Add(new UserFeatureToggle
            {
                UserId = userId,
                FeatureKey = key,
                IsEnabled = isEnabled,
                UpdatedAt = now
            });
        }
        else
        {
            row.IsEnabled = isEnabled;
            row.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync(actorUserId, "featureflag.user_update", "UserFeatureToggle", userId,
            JsonSerializer.Serialize(new { key, isEnabled }), cancellationToken);
        await notifier.PublishAsync(new FeatureFlagChangeEvent("User", key, userId, isEnabled, null, now), cancellationToken);
    }

    public async Task<Dictionary<string, bool>> GetEffectiveFlagsAsync(Guid userId, Guid? organizationId, Guid? workspaceId, Guid? branchId, CancellationToken cancellationToken)
    {
        var effective = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);

        // 1. Load global settings
        var globals = await db.GlobalFeatureFlags.AsNoTracking().ToListAsync(cancellationToken);
        foreach (var g in globals)
        {
            effective[g.Key] = string.Equals(g.Value, "true", StringComparison.OrdinalIgnoreCase);
        }

        // 2. Load organization overrides if any
        if (organizationId.HasValue)
        {
            var orgs = await db.OrganizationFeatureToggles.AsNoTracking()
                .Where(x => x.OrganizationId == organizationId.Value)
                .ToListAsync(cancellationToken);
            foreach (var o in orgs)
            {
                effective[o.FeatureKey] = o.IsEnabled;
            }
        }

        if (workspaceId.HasValue)
        {
            var workspaces = await db.WorkspaceFeatureToggles.AsNoTracking()
                .Where(x => x.WorkspaceId == workspaceId.Value)
                .ToListAsync(cancellationToken);
            foreach (var workspace in workspaces)
            {
                effective[workspace.FeatureKey] = workspace.IsEnabled;
            }
        }

        if (branchId.HasValue)
        {
            var branches = await db.BranchFeatureToggles.AsNoTracking()
                .Where(x => x.BranchId == branchId.Value)
                .ToListAsync(cancellationToken);
            foreach (var branch in branches)
            {
                effective[branch.FeatureKey] = branch.IsEnabled;
            }
        }

        // 3. Load user overrides if any
        var users = await db.UserFeatureToggles.AsNoTracking()
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken);
        foreach (var u in users)
        {
            effective[u.FeatureKey] = u.IsEnabled;
        }

        return effective;
    }

    private static string NormalizeFeatureKey(string key)
    {
        key = key.Trim();
        if (key.Length == 0 || key.Length > 120)
        {
            throw new InvalidOperationException("Invalid flag key.");
        }

        if (key.Any(char.IsWhiteSpace))
        {
            throw new InvalidOperationException("Feature flag keys cannot contain whitespace.");
        }

        return key;
    }

    private static string NormalizeFeatureValue(string value)
    {
        if (!bool.TryParse(value.Trim(), out bool enabled))
        {
            throw new InvalidOperationException("Feature flag value must be true or false.");
        }

        return enabled ? "true" : "false";
    }
}

public interface IAdminGlobalSettingsService
{
    Task<IReadOnlyList<GlobalSettingDto>> ListAsync(CancellationToken cancellationToken);
    Task UpsertAsync(string key, string value, Guid actorUserId, CancellationToken cancellationToken);
}

public sealed class AdminGlobalSettingsService(HexaTrackDbContext db, IAdminAuditService audit) : IAdminGlobalSettingsService
{
    private static bool IsBlockedKey(string key)
    {
        string lower = key.ToLowerInvariant();
        return lower.Contains("secret", StringComparison.Ordinal)
               || lower.Contains("apikey", StringComparison.Ordinal)
               || lower.Contains("password", StringComparison.Ordinal)
               || lower.Contains("signing", StringComparison.Ordinal);
    }

    public async Task<IReadOnlyList<GlobalSettingDto>> ListAsync(CancellationToken cancellationToken)
    {
        return await db.GlobalSettings.AsNoTracking()
            .OrderBy(x => x.Key)
            .Select(x => new GlobalSettingDto(x.Key, x.Value, x.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task UpsertAsync(string key, string value, Guid actorUserId, CancellationToken cancellationToken)
    {
        key = key.Trim();
        if (key.Length == 0 || key.Length > 120)
        {
            throw new InvalidOperationException("Invalid setting key.");
        }

        if (IsBlockedKey(key))
        {
            throw new InvalidOperationException("This key is reserved; configure secrets via environment variables.");
        }

        GlobalSetting? row = await db.GlobalSettings.SingleOrDefaultAsync(x => x.Key == key, cancellationToken);
        DateTimeOffset now = DateTimeOffset.UtcNow;
        if (row is null)
        {
            db.GlobalSettings.Add(new GlobalSetting { Key = key, Value = value, UpdatedAt = now });
        }
        else
        {
            row.Value = value;
            row.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync(actorUserId, "global_setting.upsert", "GlobalSetting", null,
            JsonSerializer.Serialize(new { key }), cancellationToken);
    }
}
