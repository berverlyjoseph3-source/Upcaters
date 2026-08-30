"use strict";
// enterprise-ai-agent-platform/apps/api/src/agents/social/social.types.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostStatus = exports.SocialPlatform = void 0;
/**
 * Social Media Platform Enum
 */
var SocialPlatform;
(function (SocialPlatform) {
    SocialPlatform["LINKEDIN"] = "linkedin";
    SocialPlatform["INSTAGRAM"] = "instagram";
    SocialPlatform["FACEBOOK"] = "facebook";
    SocialPlatform["X_TWITTER"] = "x_twitter";
    SocialPlatform["THREADS"] = "threads";
    SocialPlatform["TIKTOK"] = "tiktok";
})(SocialPlatform || (exports.SocialPlatform = SocialPlatform = {}));
/**
 * Post Status Enum
 */
var PostStatus;
(function (PostStatus) {
    PostStatus["DRAFT"] = "draft";
    PostStatus["SCHEDULED"] = "scheduled";
    PostStatus["PROCESSING"] = "processing";
    PostStatus["PUBLISHED"] = "published";
    PostStatus["FAILED"] = "failed";
    PostStatus["CANCELLED"] = "cancelled";
})(PostStatus || (exports.PostStatus = PostStatus = {}));
//# sourceMappingURL=social.types.js.map