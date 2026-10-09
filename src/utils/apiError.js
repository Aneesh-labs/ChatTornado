/**
 * Safely extract and format API error messages into human-readable strings.
 * Prevents React Minified Error #31 (objects/arrays rendered as React children).
 */
export function formatApiError(errorOrDetail, fallback = "An error occurred. Please try again.") {
    if (!errorOrDetail) return fallback;

    // Check if error is Axios error object
    const detail =
        errorOrDetail.response?.data?.detail ??
        errorOrDetail.response?.data?.message ??
        errorOrDetail.detail ??
        errorOrDetail.message ??
        errorOrDetail;

    if (typeof detail === "string") {
        return detail;
    }

    if (Array.isArray(detail)) {
        const msgs = detail
            .map((item) => {
                if (typeof item === "string") return item;
                if (item && typeof item === "object") {
                    // FastAPI validation error: { type, loc, msg, input }
                    return item.msg || item.message || JSON.stringify(item);
                }
                return String(item);
            })
            .filter(Boolean);

        return msgs.length > 0 ? msgs.join(". ") : fallback;
    }

    if (typeof detail === "object") {
        if (detail.msg) return String(detail.msg);
        if (detail.message) return String(detail.message);
        try {
            return JSON.stringify(detail);
        } catch {
            return fallback;
        }
    }

    return String(detail);
}

export default formatApiError;
