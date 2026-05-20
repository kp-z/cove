"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
function createContext(opts) {
    return async ({ req, res }) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-user-type, x-realm-id');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        // Handle OPTIONS preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return {
                realmId: undefined,
                userId: undefined,
                userType: 'human',
                logger: opts.logger,
                req,
                res,
            };
        }
        // Extract realm ID from headers
        const realmId = req.headers['x-realm-id'];
        // Try to authenticate via JWT token first
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const payload = await opts.authService.verifyToken(token);
                return {
                    realmId,
                    userId: payload.userId,
                    userType: 'human',
                    userRole: payload.role,
                    logger: opts.logger,
                    req,
                    res,
                };
            }
            catch (_error) {
                // Token invalid, fall through to legacy headers
                opts.logger.debug('JWT verification failed, falling back to legacy headers');
            }
        }
        // Fallback: Extract user info from legacy headers (for backward compatibility)
        const userId = req.headers['x-user-id'];
        const userType = req.headers['x-user-type'];
        return {
            realmId,
            userId,
            userType: userType || 'human',
            logger: opts.logger,
            req,
            res,
        };
    };
}
