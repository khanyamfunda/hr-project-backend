import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// 1. Core Authentication Middleware (Verifies the JWT token)
export function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    // Extract the token from the "Bearer TOKEN" format string
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Access Denied: No login token provided!" });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // Attaches user details (id, role) to the request object
        next(); // Move to the next function safely
    } catch (err) {
        res.status(403).json({ error: "Invalid or expired session token!" });
    }
}

// 2. Role-Based Authorization Middleware (Checks permissions)
export function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        // Enforce access control check against the token payload properties
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `Access Forbidden: Your role (${req.user?.role || 'Guest'}) does not have permission to view this section.` 
            });
        }
        next();
    };
}
