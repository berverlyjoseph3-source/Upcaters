"use strict";
// enterprise-ai-agent-platform/apps/api/src/agents/calendar/calendar.types.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventVisibility = exports.EventStatus = exports.AttendeeResponse = void 0;
/**
 * Attendee Response Status
 */
var AttendeeResponse;
(function (AttendeeResponse) {
    AttendeeResponse["NEEDS_ACTION"] = "needsAction";
    AttendeeResponse["DECLINED"] = "declined";
    AttendeeResponse["TENTATIVE"] = "tentative";
    AttendeeResponse["ACCEPTED"] = "accepted";
})(AttendeeResponse || (exports.AttendeeResponse = AttendeeResponse = {}));
/**
 * Event Status
 */
var EventStatus;
(function (EventStatus) {
    EventStatus["CONFIRMED"] = "confirmed";
    EventStatus["TENTATIVE"] = "tentative";
    EventStatus["CANCELLED"] = "cancelled";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
/**
 * Event Visibility
 */
var EventVisibility;
(function (EventVisibility) {
    EventVisibility["DEFAULT"] = "default";
    EventVisibility["PUBLIC"] = "public";
    EventVisibility["PRIVATE"] = "private";
    EventVisibility["CONFIDENTIAL"] = "confidential";
})(EventVisibility || (exports.EventVisibility = EventVisibility = {}));
//# sourceMappingURL=calendar.types.js.map