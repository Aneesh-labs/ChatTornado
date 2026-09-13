import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import axios from "axios"


export default function ProtectedRoute({ children }) {

    const [loading, setLoading] = useState(true)
    const API_URL =
        import.meta.env.VITE_API_URL;
    const [authorized, setAuthorized] = useState(false)

    useEffect(() => {

        const token = sessionStorage.getItem("token")

        if (!token) {
            setLoading(false)
            return
        }

        axios.get(
            `${API_URL}/verify?token=${token}`
        )

            .then(() => {
                setAuthorized(true)
            })

            .catch(() => {
                sessionStorage.removeItem("token")
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

    return children
}