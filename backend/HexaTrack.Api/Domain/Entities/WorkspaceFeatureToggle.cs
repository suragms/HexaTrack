namespace HexaTrack.Api.Domain.Entities;

/// <summary>Per-workspace feature toggles managed by Super Admin.</summary>
public sealed class WorkspaceFeatureToggle
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkspaceId { get; set; }
    public required string FeatureKey { get; set; }
    public bool IsEnabled { get; set; } = true;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Workspace? Workspace { get; set; }
}
