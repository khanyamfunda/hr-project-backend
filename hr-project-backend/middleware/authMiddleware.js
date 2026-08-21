import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    // 1. Pull the header out of the incoming transaction packet
    const authHeader = req.headers['authorization'];
    
    // 2. Extract the raw string token right after the 'Bearer ' space marker
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Access Denied: No login token provided!" });
    }

    // 3. Structural validation alignment check using matching fallback secret
    jwt.verify(token, process.env.JWT_SECRET || 'supersecretcyberpunkkey123', (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired session token!" });
        }
        
        // Save the decoded user payload to the request structure
        req.user = decoded;
        next();
    });
};

export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden: Your account role does not have authorization to view this resource." });
        }
        next();
    };
};
