"use strict";
// enterprise-ai-agent-platform/apps/api/src/agents/content/content.types.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelProvider = exports.ContentGenerationType = void 0;
/**
 * Content Type Enum
 */
var ContentGenerationType;
(function (ContentGenerationType) {
    ContentGenerationType["TEXT"] = "text";
    ContentGenerationType["IMAGE"] = "image";
    ContentGenerationType["VIDEO"] = "video";
    ContentGenerationType["AUDIO"] = "audio";
    ContentGenerationType["CODE"] = "code";
})(ContentGenerationType || (exports.ContentGenerationType = ContentGenerationType = {}));
/**
 * Content Model Provider
 */
var ModelProvider;
(function (ModelProvider) {
    ModelProvider["OPENAI"] = "openai";
    ModelProvider["ANTHROPIC"] = "anthropic";
    ModelProvider["GOOGLE"] = "google";
    ModelProvider["STABILITY"] = "stability";
    ModelProvider["RUNWAY"] = "runway";
})(ModelProvider || (exports.ModelProvider = ModelProvider = {}));
//# sourceMappingURL=content.types.js.map