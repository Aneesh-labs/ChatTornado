import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import API from "../Services/API"

export default function ProtectedRoute({ children }) {

    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false);
    const [emailVerified, setEmailVerified] = useState(true);

    useEffect(() => {
        const token = sessionStorage.getItem("token")

        if (!token) {
            setLoading(false)
            return
        }

        API.get(`/verify?token=${token}`)
            .then((res) => {
                sessionStorage.setItem("emailVerified", String(res.data.email_verified));
                if (res.data.email) {
                    sessionStorage.setItem("email", res.data.email);
                }
                if (res.data.username) {
                    sessionStorage.setItem("username", res.data.username);
                }
                setEmailVerified(res.data.email_verified);
                setAuthorized(true)
            })
            .catch(() => {
                sessionStorage.removeItem("token")
                sessionStorage.removeItem("emailVerified")
                setAuthorized(false)
            })
            .finally(() => {
                setLoading(false)
            })

    }, [])

    if (loading) {
        return <div>Authenticating...</div>
    }

    if (!authorized) {
        return <Navigate to="/" replace />
    }

    // If authorized but email not verified, only allow them on the verify-email page or show a prompt
    if (!emailVerified && window.location.pathname !== "/verify-email") {
        return <Navigate to="/verify-email" replace />
    }

    return children
}