import jwt from "jsonwebtoken";

export const verifyToken = (request, response, next) => {
    const token = request.cookies.jwt;

    if (!token) {
        console.log("Verify Token: No token found in cookies. Sending 401.");
        return response.status(401).json({ message: "Unauthorized access" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                console.log("Verify Token: JWT Expired. Sending 403.");
                return response.status(403).json({ message: "Forbidden access - Token expired" });
            } else {
                console.log("Verify Token: JWT verification failed (other error). Sending 403. Error:", err.message);
                return response.status(403).json({ message: "Forbidden access - Invalid token" });
            }
        }
        request.userId = payload.userId;
       
        next();
    });
};