/**
 * Sign a JWT, store it in an httpOnly cookie, and respond.
 * The token is NOT sent in the JSON body to prevent XSS leakage.
 *
 * @param {Object} user       - Mongoose user document
 * @param {number} statusCode - HTTP response status code
 * @param {Object} res        - Express response object
 */
export const sendToken = (user, statusCode, res) => {
    const token = user.getJWT();

    const cookieOptions = {
        expires: new Date(
            Date.now() + Number(process.env.COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,                                     // Not accessible via JS
        secure: process.env.NODE_ENV === "production",     // HTTPS only in prod
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    };

    // Strip the password field before sending the user object
    const userObject = user.toObject();
    delete userObject.password;

    res.status(statusCode)
        .cookie("token", token, cookieOptions)
        .json({ success: true, user: userObject });
};
