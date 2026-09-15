import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import axios from "axios"


export default function ProtectedRoute({ children }) {

    const [loading, setLoading] = useState(true)
    const API_URL =
        import.meta.env.VITE_API_URL;
    const [authorized, setAuthorized] = useState(false);
    const [emailVerified, setEmailVerified] = useState(true);

    useEffect(() => {
        const token = sessionStorage.getItem("token")

        if (!token) {
            setLoading(false)
            return
        }

        axios.get(
            `${API_URL}/verify?token=${token}`
        )
            .then((res) => {
                sessionStorage.setItem("emailVerified", res.data.email_verified);
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

    }, [API_URL])

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