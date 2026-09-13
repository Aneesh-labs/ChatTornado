import React from "react";
import PropTypes from "prop-types";
import { StatusDot } from "./constants";

const OnlineIndicator = React.memo(({ online, size = "sm" }) => {
    const statusText = online ? "Online" : "Offline";

    return (
        <div
            className="inline-flex items-center justify-center select-none touch-manipulation"
            role="status"
            aria-live="polite"
        >
            {/* Hidden description wrapper explicitly for screen readers */}
            <span className="sr-only">{statusText}</span>

            <StatusDot
                status={online ? "online" : "offline"}
                size={size}
                aria-hidden="true"
            />
        </div>
    );
});

OnlineIndicator.propTypes = {
    online: PropTypes.bool.isRequired,
    size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
};

OnlineIndicator.displayName = "OnlineIndicator";

export default OnlineIndicator;