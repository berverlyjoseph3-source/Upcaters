"use strict";
// enterprise-ai-agent-platform/apps/api/src/types/admin.types.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceStatus = exports.UsageTrend = exports.OverageAlertSeverity = exports.TicketPriority = exports.TicketStatus = exports.AuditAction = exports.UserStatus = exports.UserRole = exports.PlanId = void 0;
// ============================================
// Enums
// ============================================
var PlanId;
(function (PlanId) {
    PlanId["FREE"] = "FREE";
    PlanId["STARTER"] = "STARTER";
    PlanId["PROFESSIONAL"] = "PROFESSIONAL";
    PlanId["ENTERPRISE"] = "ENTERPRISE";
    PlanId["CUSTOM"] = "CUSTOM";
})(PlanId || (exports.PlanId = PlanId = {}));
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "USER";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["SUPPORT"] = "SUPPORT";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["PENDING"] = "pending";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["USER_CREATE"] = "user_create";
    AuditAction["USER_UPDATE"] = "user_update";
    AuditAction["USER_DELETE"] = "user_delete";
    AuditAction["USER_SUSPEND"] = "user_suspend";
    AuditAction["USER_ACTIVATE"] = "user_activate";
    AuditAction["PLAN_CHANGE"] = "plan_change";
    AuditAction["ROLE_CHANGE"] = "role_change";
    AuditAction["LOGIN"] = "login";
    AuditAction["LOGOUT"] = "logout";
    AuditAction["API_ACCESS"] = "api_access";
    AuditAction["SETTINGS_UPDATE"] = "settings_update";
    AuditAction["ANNOUNCEMENT_CREATE"] = "announcement_create";
    AuditAction["ANNOUNCEMENT_UPDATE"] = "announcement_update";
    AuditAction["ANNOUNCEMENT_DELETE"] = "announcement_delete";
    AuditAction["OAUTH_LOGIN"] = "oauth_login";
    AuditAction["PAYMENT_SUCCEEDED"] = "payment_succeeded";
    AuditAction["PAYMENT_FAILED"] = "payment_failed";
    AuditAction["SUBSCRIPTION_CREATED"] = "subscription_created";
    AuditAction["SUBSCRIPTION_CANCELLED"] = "subscription_cancelled";
    AuditAction["SUBSCRIPTION_UPDATED"] = "subscription_updated";
    AuditAction["OVERAGE_NOTIFICATION"] = "overage_notification";
    AuditAction["BULK_ACTION"] = "bulk_action";
    AuditAction["IMPERSONATION"] = "impersonation";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var TicketStatus;
(function (TicketStatus) {
    TicketStatus["OPEN"] = "open";
    TicketStatus["IN_PROGRESS"] = "in_progress";
    TicketStatus["RESOLVED"] = "resolved";
    TicketStatus["CLOSED"] = "closed";
})(TicketStatus || (exports.TicketStatus = TicketStatus = {}));
var TicketPriority;
(function (TicketPriority) {
    TicketPriority["LOW"] = "low";
    TicketPriority["MEDIUM"] = "medium";
    TicketPriority["HIGH"] = "high";
    TicketPriority["URGENT"] = "urgent";
})(TicketPriority || (exports.TicketPriority = TicketPriority = {}));
var OverageAlertSeverity;
(function (OverageAlertSeverity) {
    OverageAlertSeverity["CRITICAL"] = "critical";
    OverageAlertSeverity["HIGH"] = "high";
    OverageAlertSeverity["MEDIUM"] = "medium";
    OverageAlertSeverity["LOW"] = "low";
})(OverageAlertSeverity || (exports.OverageAlertSeverity = OverageAlertSeverity = {}));
var UsageTrend;
(function (UsageTrend) {
    UsageTrend["INCREASING"] = "increasing";
    UsageTrend["DECREASING"] = "decreasing";
    UsageTrend["STABLE"] = "stable";
})(UsageTrend || (exports.UsageTrend = UsageTrend = {}));
var ServiceStatus;
(function (ServiceStatus) {
    ServiceStatus["HEALTHY"] = "healthy";
    ServiceStatus["DEGRADED"] = "degraded";
    ServiceStatus["DOWN"] = "down";
    ServiceStatus["MAINTENANCE"] = "maintenance";
    ServiceStatus["UNKNOWN"] = "unknown";
})(ServiceStatus || (exports.ServiceStatus = ServiceStatus = {}));
//# sourceMappingURL=admin.types.js.map