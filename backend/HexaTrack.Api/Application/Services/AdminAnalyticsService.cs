using Microsoft.EntityFrameworkCore;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Domain;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure;

namespace HexaTrack.Api.Application.Services;

public interface IAdminAnalyticsService
{
    Task<AdminAnalyticsOverviewDto> GetOverviewAsync(CancellationToken cancellationToken);
    Task<AdminAnalyticsDashboardDto> GetDashboardAsync(int days, CancellationToken cancellationToken);
    Task<IReadOnlyList<AdminExpenseCategoryAggDto>> GetCategoryTotalsAsync(int days, Guid? orgId, CancellationToken cancellationToken);
}

public sealed class AdminAnalyticsService(HexaTrackDbContext db) : IAdminAnalyticsService
{
    private const decimal EstPromptUsdPerMillion = 3;
    private const decimal EstCompletionUsdPerMillion = 15;

    private static readonly SubscriptionPlan[] PaidPlans =
    [
        SubscriptionPlan.Basic,
        SubscriptionPlan.Pro,
        SubscriptionPlan.ProMax,
    ];

    public async Task<AdminAnalyticsOverviewDto> GetOverviewAsync(CancellationToken cancellationToken)
    {
        DateOnly from = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(-30));

        int totalUsers = await db.Users.AsNoTracking().CountAsync(cancellationToken);
        int superAdmins = await db.Users.AsNoTracking().CountAsync(x => x.IsSuperAdmin, cancellationToken);
        int locked = await db.Users.AsNoTracking().CountAsync(x => x.IsLocked, cancellationToken);
        int workspaces = await db.Workspaces.AsNoTracking().CountAsync(cancellationToken);
        int activeSubs = await db.UserSubscriptions.AsNoTracking().CountAsync(x => x.IsActive, cancellationToken);

        long prompt = await db.AiUsageDaily.AsNoTracking()
            .Where(x => x.DayUtc >= from)
            .SumAsync(x => (long)x.PromptTokens, cancellationToken);
        long completion = await db.AiUsageDaily.AsNoTracking()
            .Where(x => x.DayUtc >= from)
            .SumAsync(x => (long)x.CompletionTokens, cancellationToken);

        return new AdminAnalyticsOverviewDto(
            totalUsers,
            superAdmins,
            locked,
            workspaces,
            activeSubs,
            prompt,
            completion);
    }

    public async Task<AdminAnalyticsDashboardDto> GetDashboardAsync(int days, CancellationToken cancellationToken)
    {
        days = Math.Clamp(days, 7, 365);
        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        DateOnly start = today.AddDays(-days + 1);
        DateOnly financialStart30d = today.AddDays(-29);

        DateTimeOffset fromDateTime = new(start.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);

        int baselineUsers = await db.Users.AsNoTracking()
            .CountAsync(u => u.CreatedAt < fromDateTime, cancellationToken);
        var userGroups = await db.Users.AsNoTracking()
            .Where(u => u.CreatedAt >= fromDateTime)
            .GroupBy(u => DateOnly.FromDateTime(u.CreatedAt.UtcDateTime.Date))
            .Select(g => new { Day = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);
        Dictionary<DateOnly, int> userDict = userGroups.ToDictionary(x => x.Day, x => x.Count);

        int baselineWs = await db.Workspaces.AsNoTracking()
            .CountAsync(w => w.CreatedAt < fromDateTime, cancellationToken);
        var wsGroups = await db.Workspaces.AsNoTracking()
            .Where(w => w.CreatedAt >= fromDateTime)
            .GroupBy(w => DateOnly.FromDateTime(w.CreatedAt.UtcDateTime.Date))
            .Select(g => new { Day = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);
        Dictionary<DateOnly, int> wsDict = wsGroups.ToDictionary(x => x.Day, x => x.Count);

        var tokenGroups = await db.AiUsageDaily.AsNoTracking()
            .Where(a => a.DayUtc >= start && a.DayUtc <= today)
            .GroupBy(a => a.DayUtc)
            .Select(g => new
            {
                Day = g.Key,
                Prompt = g.Sum(a => (long)a.PromptTokens),
                Completion = g.Sum(a => (long)a.CompletionTokens),
            })
            .ToListAsync(cancellationToken);
        Dictionary<DateOnly, (long Prompt, long Completion)> tokenDict = tokenGroups.ToDictionary(
            x => x.Day,
            x => (x.Prompt, x.Completion));

        List<AdminSubscriptionTierDto> tiers = await db.UserSubscriptions.AsNoTracking()
            .Where(s => s.IsActive)
            .GroupBy(s => s.Plan)
            .Select(g => new AdminSubscriptionTierDto(g.Key.ToString(), g.Count()))
            .ToListAsync(cancellationToken);

        List<PricingConfiguration> activePricingRows = await db.PricingConfigurations.AsNoTracking()
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.UpdatedAt)
            .ToListAsync(cancellationToken);
        Dictionary<string, decimal> activePlanPrices = activePricingRows
            .GroupBy(p => p.PlanName, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().MonthlyPrice, StringComparer.OrdinalIgnoreCase);

        int payingCount = 0;
        decimal mrrInr = 0;
        foreach (AdminSubscriptionTierDto tier in tiers)
        {
            decimal price = activePlanPrices.GetValueOrDefault(tier.Plan);
            if (price <= 0)
            {
                continue;
            }

            payingCount += tier.Count;
            mrrInr += price * tier.Count;
        }

        decimal arpu = payingCount > 0 ? decimal.Round(mrrInr / payingCount, 2, MidpointRounding.AwayFromZero) : 0;

        var activeGroups = await db.Transactions.AsNoTracking()
            .Where(t => t.OccurredOn >= start && t.OccurredOn <= today)
            .GroupBy(t => t.OccurredOn)
            .Select(g => new { Day = g.Key, Count = g.Select(t => t.UserId).Distinct().Count() })
            .ToListAsync(cancellationToken);
        Dictionary<DateOnly, int> activeDict = activeGroups.ToDictionary(x => x.Day, x => x.Count);

        var txDayGroups = await db.Transactions.AsNoTracking()
            .Where(t => t.OccurredOn >= start && t.OccurredOn <= today)
            .GroupBy(t => t.OccurredOn)
            .Select(g => new { Day = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);
        Dictionary<DateOnly, int> txDict = txDayGroups.ToDictionary(x => x.Day, x => x.Count);

        var paidSubGroups = await db.UserSubscriptions.AsNoTracking()
            .Where(s => PaidPlans.Contains(s.Plan) && s.CreatedAt >= fromDateTime)
            .GroupBy(s => DateOnly.FromDateTime(s.CreatedAt.UtcDateTime.Date))
            .Select(g => new { Day = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);
        Dictionary<DateOnly, int> paidSubDict = paidSubGroups.ToDictionary(x => x.Day, x => x.Count);

        int baselineOrgs = await db.Organizations.AsNoTracking()
            .CountAsync(o => o.CreatedAt < fromDateTime, cancellationToken);
        var orgGroups = await db.Organizations.AsNoTracking()
            .Where(o => o.CreatedAt >= fromDateTime)
            .GroupBy(o => DateOnly.FromDateTime(o.CreatedAt.UtcDateTime.Date))
            .Select(g => new { Day = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);
        Dictionary<DateOnly, int> orgDict = orgGroups.ToDictionary(x => x.Day, x => x.Count);

        var workspaceActivityGroups = await db.Transactions.AsNoTracking()
            .Where(t => t.OccurredOn >= start && t.OccurredOn <= today)
            .GroupBy(t => t.OccurredOn)
            .Select(g => new { Day = g.Key, Count = g.Select(t => t.WorkspaceId).Distinct().Count() })
            .ToListAsync(cancellationToken);
        Dictionary<DateOnly, int> workspaceActivityDict = workspaceActivityGroups.ToDictionary(x => x.Day, x => x.Count);

        var rawCats = await db.Transactions.AsNoTracking()
            .Where(t => t.Type == TransactionType.Expense && t.OccurredOn >= start && t.OccurredOn <= today)
            .Join(
                db.Categories.AsNoTracking(),
                t => t.CategoryId,
                c => c.Id,
                (t, c) => new { c.Name, t.Currency, t.Amount })
            .GroupBy(x => new { x.Name, x.Currency })
            .Select(g => new
            {
                g.Key.Name,
                g.Key.Currency,
                Total = g.Sum(x => x.Amount),
                Count = g.Count()
            })
            .OrderByDescending(x => x.Total)
            .Take(12)
            .ToListAsync(cancellationToken);

        List<AdminExpenseCategoryAggDto> expenseCats = rawCats
            .Select(x => new AdminExpenseCategoryAggDto(x.Name, x.Currency, x.Total, x.Count))
            .ToList();

        decimal incomeSum30d = await db.Transactions.AsNoTracking()
            .Where(t => t.Type == TransactionType.Income && t.OccurredOn >= financialStart30d && t.OccurredOn <= today)
            .SumAsync(t => t.Amount, cancellationToken);
        decimal expenseSum30d = await db.Transactions.AsNoTracking()
            .Where(t => t.Type == TransactionType.Expense && t.OccurredOn >= financialStart30d && t.OccurredOn <= today)
            .SumAsync(t => t.Amount, cancellationToken);
        int activeOrgs = await db.Organizations.AsNoTracking().CountAsync(o => o.IsActive && !o.IsSuspended, cancellationToken);
        int suspendedOrgs = await db.Organizations.AsNoTracking().CountAsync(o => o.IsSuspended, cancellationToken);
        int individualUsers = await db.Users.AsNoTracking().CountAsync(u => u.OrganizationId == null && !u.IsSuperAdmin, cancellationToken);
        int organizationUsers = await db.Users.AsNoTracking().CountAsync(u => u.OrganizationId != null, cancellationToken);
        int totalWorkspaces = await db.Workspaces.AsNoTracking().CountAsync(cancellationToken);
        int activeBranches = await db.Branches.AsNoTracking().CountAsync(b => b.IsEnabled, cancellationToken);
        int totalTransactions = await db.Transactions.AsNoTracking().CountAsync(cancellationToken);
        DateTimeOffset activeSessionSince = DateTimeOffset.UtcNow.AddHours(-24);
        int activeSessions = await db.AdminAuditLogs.AsNoTracking()
            .Where(a => a.Action.Contains("login") && !a.Action.Contains("failed") && a.CreatedAt >= activeSessionSince)
            .Select(a => a.ActorUserId)
            .Distinct()
            .CountAsync(cancellationToken);

        List<AdminTimeSeriesPointDto> newUsers = [];
        List<AdminTimeSeriesPointDto> cumUsers = [];
        List<AdminTimeSeriesPointDto> newWs = [];
        List<AdminTimeSeriesPointDto> cumWs = [];
        List<AdminTokenUsageDayDto> tokenSeries = [];
        List<AdminTimeSeriesPointDto> activeSeries = [];
        List<AdminTimeSeriesPointDto> txSeries = [];
        List<AdminTimeSeriesPointDto> paidSubSeries = [];
        List<AdminTokenCostDayDto> tokenCostSeries = [];
        List<AdminTimeSeriesPointDto> orgGrowthSeries = [];
        List<AdminTimeSeriesPointDto> workspaceActivitySeries = [];

        int runUser = baselineUsers;
        int runWs = baselineWs;
        int runOrg = baselineOrgs;
        for (DateOnly d = start; d <= today; d = d.AddDays(1))
        {
            int nu = userDict.GetValueOrDefault(d);
            runUser += nu;
            string ds = d.ToString("yyyy-MM-dd");
            newUsers.Add(new AdminTimeSeriesPointDto(ds, nu));
            cumUsers.Add(new AdminTimeSeriesPointDto(ds, runUser));
            int nw = wsDict.GetValueOrDefault(d);
            runWs += nw;
            newWs.Add(new AdminTimeSeriesPointDto(ds, nw));
            cumWs.Add(new AdminTimeSeriesPointDto(ds, runWs));
            (long p, long c) = tokenDict.GetValueOrDefault(d, (0L, 0L));
            tokenSeries.Add(new AdminTokenUsageDayDto(ds, p, c));
            decimal costUsd = p / 1_000_000m * EstPromptUsdPerMillion + c / 1_000_000m * EstCompletionUsdPerMillion;
            tokenCostSeries.Add(new AdminTokenCostDayDto(ds, decimal.Round(costUsd, 4, MidpointRounding.AwayFromZero)));
            activeSeries.Add(new AdminTimeSeriesPointDto(ds, activeDict.GetValueOrDefault(d)));
            txSeries.Add(new AdminTimeSeriesPointDto(ds, txDict.GetValueOrDefault(d)));
            paidSubSeries.Add(new AdminTimeSeriesPointDto(ds, paidSubDict.GetValueOrDefault(d)));
            int no = orgDict.GetValueOrDefault(d);
            runOrg += no;
            orgGrowthSeries.Add(new AdminTimeSeriesPointDto(ds, runOrg));
            workspaceActivitySeries.Add(new AdminTimeSeriesPointDto(ds, workspaceActivityDict.GetValueOrDefault(d)));
        }

        return new AdminAnalyticsDashboardDto(
            newUsers,
            cumUsers,
            newWs,
            cumWs,
            tokenSeries,
            tiers,
            mrrInr,
            payingCount,
            arpu,
            activeSeries,
            txSeries,
            paidSubSeries,
            tokenCostSeries,
            expenseCats,
            incomeSum30d,
            expenseSum30d,
            incomeSum30d - expenseSum30d,
            activeOrgs,
            suspendedOrgs,
            individualUsers,
            organizationUsers,
            totalWorkspaces,
            activeBranches,
            totalTransactions,
            activeSessions,
            orgGrowthSeries,
            workspaceActivitySeries);
    }

    public async Task<IReadOnlyList<AdminExpenseCategoryAggDto>> GetCategoryTotalsAsync(int days, Guid? orgId, CancellationToken cancellationToken)
    {
        days = Math.Clamp(days, 1, 365);
        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        DateOnly start = today.AddDays(-days + 1);

        IQueryable<HexaTrack.Api.Domain.Entities.Transaction> txQuery = db.Transactions.AsNoTracking()
            .Where(t => t.Type == TransactionType.Expense && t.OccurredOn >= start && t.OccurredOn <= today);

        if (orgId.HasValue)
        {
            List<Guid> workspaceIds = await db.Branches.AsNoTracking()
                .Where(b => b.OrganizationId == orgId.Value && b.WorkspaceId.HasValue)
                .Select(b => b.WorkspaceId!.Value)
                .ToListAsync(cancellationToken);
            txQuery = txQuery.Where(t => workspaceIds.Contains(t.WorkspaceId));
        }

        return await txQuery
            .Join(
                db.Categories.AsNoTracking(),
                t => t.CategoryId,
                c => c.Id,
                (t, c) => new { c.Name, t.Currency, t.Amount })
            .GroupBy(x => new { x.Name, x.Currency })
            .Select(g => new AdminExpenseCategoryAggDto(g.Key.Name, g.Key.Currency, g.Sum(x => x.Amount), g.Count()))
            .OrderByDescending(x => x.TotalAmount)
            .Take(20)
            .ToListAsync(cancellationToken);
    }
}
