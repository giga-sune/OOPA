/**
 * @typedef {Object} AuthCredentials
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} SignupInput
 * @property {string} email
 * @property {string} password
 * @property {string} confirmPassword
 * @property {string=} displayName
 * @property {string=} photoURL
 * @property {string=} phone
 */

/**
 * @typedef {Object} AuthResult
 * @property {import("firebase/auth").User} user
 */

/**
 * @typedef {Object} ServiceError
 * @property {string} code
 * @property {string} message
 */

export const authTypes = {};
