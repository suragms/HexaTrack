using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HexaTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class SuperAdminEnterpriseIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_BranchId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_OrganizationId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Branches_WorkspaceId",
                table: "Branches");

            migrationBuilder.CreateIndex(
                name: "IX_Workspaces_CreatedAt",
                table: "Workspaces",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Users_BranchId",
                table: "Users",
                column: "BranchId",
                filter: "\"BranchId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Users_CreatedAt",
                table: "Users",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Users_OrganizationId",
                table: "Users",
                column: "OrganizationId",
                filter: "\"OrganizationId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_CreatedAt",
                table: "Organizations",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_CreatedAt",
                table: "Branches",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_OrganizationId_IsEnabled",
                table: "Branches",
                columns: new[] { "OrganizationId", "IsEnabled" });

            migrationBuilder.CreateIndex(
                name: "IX_Branches_WorkspaceId",
                table: "Branches",
                column: "WorkspaceId",
                filter: "\"WorkspaceId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AdminAuditLogs_Action_CreatedAt",
                table: "AdminAuditLogs",
                columns: new[] { "Action", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AdminAuditLogs_TargetType_CreatedAt",
                table: "AdminAuditLogs",
                columns: new[] { "TargetType", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AdminAlerts_IsResolved_Severity_CreatedAt",
                table: "AdminAlerts",
                columns: new[] { "IsResolved", "Severity", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Workspaces_CreatedAt",
                table: "Workspaces");

            migrationBuilder.DropIndex(
                name: "IX_Users_BranchId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_CreatedAt",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_OrganizationId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Organizations_CreatedAt",
                table: "Organizations");

            migrationBuilder.DropIndex(
                name: "IX_Branches_CreatedAt",
                table: "Branches");

            migrationBuilder.DropIndex(
                name: "IX_Branches_OrganizationId_IsEnabled",
                table: "Branches");

            migrationBuilder.DropIndex(
                name: "IX_Branches_WorkspaceId",
                table: "Branches");

            migrationBuilder.DropIndex(
                name: "IX_AdminAuditLogs_Action_CreatedAt",
                table: "AdminAuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AdminAuditLogs_TargetType_CreatedAt",
                table: "AdminAuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AdminAlerts_IsResolved_Severity_CreatedAt",
                table: "AdminAlerts");

            migrationBuilder.CreateIndex(
                name: "IX_Users_BranchId",
                table: "Users",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_OrganizationId",
                table: "Users",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_WorkspaceId",
                table: "Branches",
                column: "WorkspaceId");
        }
    }
}
