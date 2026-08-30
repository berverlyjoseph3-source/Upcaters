"use strict";
// enterprise-ai-agent-platform/apps/api/src/types/usage.types.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_ACCESS_MATRIX = exports.OVERAGE_PRICING_CONFIG = exports.PLAN_LIMITS_CONFIG = exports.ACTION_COSTS = exports.ActionType = void 0;
/**
 * Action types and their costs
 */
var ActionType;
(function (ActionType) {
    // AI Actions (counts toward AI Actions limit)
    ActionType["AI_EMAIL_PROCESS"] = "ai_email_process";
    ActionType["AI_EMAIL_REPLY"] = "ai_email_reply";
    ActionType["AI_CONTENT_TEXT"] = "ai_content_text";
    ActionType["AI_CONTENT_IMAGE"] = "ai_content_image";
    ActionType["AI_CONTENT_VIDEO"] = "ai_content_video";
    ActionType["AI_SOCIAL_POST"] = "ai_social_post";
    ActionType["AI_CALENDAR_SCHEDULE"] = "ai_calendar_schedule";
    ActionType["AI_TASK_CREATE"] = "ai_task_create";
    ActionType["AI_WEB_SEARCH"] = "ai_web_search";
    ActionType["AI_ORCHESTRATOR"] = "ai_orchestrator";
    // API Calls (counts toward API Calls limit)
    ActionType["API_EMAIL_FETCH"] = "api_email_fetch";
    ActionType["API_EMAIL_SEND"] = "api_email_send";
    ActionType["API_DRIVE_UPLOAD"] = "api_drive_upload";
    ActionType["API_DRIVE_DOWNLOAD"] = "api_drive_download";
    ActionType["API_SOCIAL_POST"] = "api_social_post";
    ActionType["API_CALENDAR_GET"] = "api_calendar_get";
    ActionType["API_CALENDAR_CREATE"] = "api_calendar_create";
    ActionType["API_TASK_GET"] = "api_task_get";
    ActionType["API_TASK_UPDATE"] = "api_task_update";
    ActionType["API_WEB_SCRAPE"] = "api_web_scrape";
})(ActionType || (exports.ActionType = ActionType = {}));
/**
 * Action costs mapping
 */
exports.ACTION_COSTS = {
    [ActionType.AI_EMAIL_PROCESS]: {
        actionType: ActionType.AI_EMAIL_PROCESS,
        category: 'ai_action',
        baseCost: 1,
        tokenMultiplier: 0.001,
        requiresApiCall: true,
    },
    [ActionType.AI_EMAIL_REPLY]: {
        actionType: ActionType.AI_EMAIL_REPLY,
        category: 'ai_action',
        baseCost: 2,
        tokenMultiplier: 0.002,
        requiresApiCall: true,
    },
    [ActionType.AI_CONTENT_TEXT]: {
        actionType: ActionType.AI_CONTENT_TEXT,
        category: 'ai_action',
        baseCost: 3,
        tokenMultiplier: 0.001,
        requiresApiCall: true,
    },
    [ActionType.AI_CONTENT_IMAGE]: {
        actionType: ActionType.AI_CONTENT_IMAGE,
        category: 'ai_action',
        baseCost: 5,
        requiresApiCall: true,
    },
    [ActionType.AI_CONTENT_VIDEO]: {
        actionType: ActionType.AI_CONTENT_VIDEO,
        category: 'ai_action',
        baseCost: 20,
        requiresApiCall: true,
    },
    [ActionType.AI_SOCIAL_POST]: {
        actionType: ActionType.AI_SOCIAL_POST,
        category: 'ai_action',
        baseCost: 1,
        requiresApiCall: true,
    },
    [ActionType.AI_CALENDAR_SCHEDULE]: {
        actionType: ActionType.AI_CALENDAR_SCHEDULE,
        category: 'ai_action',
        baseCost: 1,
        tokenMultiplier: 0.0005,
        requiresApiCall: true,
    },
    [ActionType.AI_TASK_CREATE]: {
        actionType: ActionType.AI_TASK_CREATE,
        category: 'ai_action',
        baseCost: 1,
        tokenMultiplier: 0.0005,
        requiresApiCall: true,
    },
    [ActionType.AI_WEB_SEARCH]: {
        actionType: ActionType.AI_WEB_SEARCH,
        category: 'ai_action',
        baseCost: 1,
        requiresApiCall: true,
    },
    [ActionType.AI_ORCHESTRATOR]: {
        actionType: ActionType.AI_ORCHESTRATOR,
        category: 'ai_action',
        baseCost: 2,
        tokenMultiplier: 0.002,
        requiresApiCall: true,
    },
    [ActionType.API_EMAIL_FETCH]: {
        actionType: ActionType.API_EMAIL_FETCH,
        category: 'api_call',
        baseCost: 1,
        requiresApiCall: true,
    },
    [ActionType.API_EMAIL_SEND]: {
        actionType: ActionType.API_EMAIL_SEND,
        category: 'api_call',
        baseCost: 1,
        requiresApiCall: true,
    },
    [ActionType.API_DRIVE_UPLOAD]: {
        actionType: ActionType.API_DRIVE_UPLOAD,
        category: 'api_call',
        baseCost: 2,
        requiresApiCall: true,
    },
    [ActionType.API_DRIVE_DOWNLOAD]: {
        actionType: ActionType.API_DRIVE_DOWNLOAD,
        category: 'api_call',
        baseCost: 1,
        requiresApiCall: true,
    },
    [ActionType.API_SOCIAL_POST]: {
        actionType: ActionType.API_SOCIAL_POST,
        category: 'api_call',
        baseCost: 1,
        requiresApiCall: true,
    },
    [ActionType.API_CALENDAR_GET]: {
        actionType: ActionType.API_CALENDAR_GET,
        category: 'api_call',
        baseCost: 1,
        requiresApiCall: true,
    },
    [ActionType.API_CALENDAR_CREATE]: {
        actionType: ActionType.API_CALENDAR_CREATE,
        category: 'api_call',
        baseCost: 1,
        requiresApiCall: true,
    },
    [ActionType.API_TASK_GET]: {
        actionType: ActionType.API_TASK_GET,
        category: 'api_call',
        baseCost: 1,
        requiresApiCall: true,
    },
    [ActionType.API_TASK_UPDATE]: {
        actionType: ActionType.API_TASK_UPDATE,
        category: 'api_call',
        baseCost: 1,
        requiresApiCall: true,
    },
    [ActionType.API_WEB_SCRAPE]: {
        actionType: ActionType.API_WEB_SCRAPE,
        category: 'api_call',
        baseCost: 2,
        requiresApiCall: true,
    },
};
/**
 * Plan limits configuration — Enterprise now has soft caps
 */
exports.PLAN_LIMITS_CONFIG = {
    FREE: {
        aiActions: 50,
        apiCalls: 100,
        teamMembers: 1,
        storageGB: 0.1,
    },
    STARTER: {
        aiActions: 500,
        apiCalls: 2000,
        teamMembers: 3,
        storageGB: 1,
    },
    PROFESSIONAL: {
        aiActions: 2500,
        apiCalls: 15000,
        teamMembers: 10,
        storageGB: 10,
    },
    ENTERPRISE: {
        aiActions: 10000, // Soft cap — was 'unlimited'
        apiCalls: 50000, // Soft cap — was 'unlimited'
        teamMembers: 100,
        storageGB: 100,
    },
    CUSTOM: {
        aiActions: 100000,
        apiCalls: 500000,
        teamMembers: 500,
        storageGB: 1000,
    },
};
/**
 * Overage pricing configuration per plan
 */
exports.OVERAGE_PRICING_CONFIG = {
    FREE: {
        aiAction: 0,
        apiCall: 0,
        imageGeneration: 0,
        videoGeneration: 0,
    },
    STARTER: {
        aiAction: 0.05,
        apiCall: 0.01,
        imageGeneration: 0.10,
        videoGeneration: 1.00,
    },
    PROFESSIONAL: {
        aiAction: 0.05,
        apiCall: 0.01,
        imageGeneration: 0.10,
        videoGeneration: 1.00,
    },
    ENTERPRISE: {
        aiAction: 0.02,
        apiCall: 0.005,
        imageGeneration: 0.05,
        videoGeneration: 0.50,
    },
    CUSTOM: {
        aiAction: 0.01,
        apiCall: 0.002,
        imageGeneration: 0.03,
        videoGeneration: 0.30,
    },
};
exports.FEATURE_ACCESS_MATRIX = {
    FREE: {
        emailAgent: true,
        driveAgent: false,
        contentAgentText: true,
        contentAgentImage: false,
        contentAgentVideo: false,
        socialUploadAgent: false,
        calendarAgent: true,
        webAgent: true,
        taskAgent: false,
        multiPlatformPosts: false,
        apiAccess: false,
        whiteLabel: false,
        customIntegrations: false,
        slaGuarantee: false,
    },
    STARTER: {
        emailAgent: true,
        driveAgent: true,
        contentAgentText: true,
        contentAgentImage: false,
        contentAgentVideo: false,
        socialUploadAgent: true,
        calendarAgent: true,
        webAgent: true,
        taskAgent: true,
        multiPlatformPosts: false,
        apiAccess: false,
        whiteLabel: false,
        customIntegrations: false,
        slaGuarantee: false,
    },
    PROFESSIONAL: {
        emailAgent: true,
        driveAgent: true,
        contentAgentText: true,
        contentAgentImage: true,
        contentAgentVideo: false,
        socialUploadAgent: true,
        calendarAgent: true,
        webAgent: true,
        taskAgent: true,
        multiPlatformPosts: true,
        apiAccess: true,
        whiteLabel: false,
        customIntegrations: false,
        slaGuarantee: false,
    },
    ENTERPRISE: {
        emailAgent: true,
        driveAgent: true,
        contentAgentText: true,
        contentAgentImage: true,
        contentAgentVideo: true,
        socialUploadAgent: true,
        calendarAgent: true,
        webAgent: true,
        taskAgent: true,
        multiPlatformPosts: true,
        apiAccess: true,
        whiteLabel: true,
        customIntegrations: true,
        slaGuarantee: true,
    },
    CUSTOM: {
        emailAgent: true,
        driveAgent: true,
        contentAgentText: true,
        contentAgentImage: true,
        contentAgentVideo: true,
        socialUploadAgent: true,
        calendarAgent: true,
        webAgent: true,
        taskAgent: true,
        multiPlatformPosts: true,
        apiAccess: true,
        whiteLabel: true,
        customIntegrations: true,
        slaGuarantee: true,
    },
};
//# sourceMappingURL=usage.types.js.map