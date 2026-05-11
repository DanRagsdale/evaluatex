import Token from "../Token";
import texCharacters from "./texCharacters";

// This table lists tokens that should be replaced by other tokens before parsing.
// The key has format "{token type}:{token value}"

/**
 * Replaces a token according to a set of replacement rules. This simplifies parsing and makes LaTeX work better.
 * @param token
 * @returns {*}
 */
export default function replaceToken(token) {
    // if (token.type === Token.TYPE_COMMAND && token.value === "\\left(") {
    //     return new Token(Token.TYPE_LPAREN, "(");
    // }
    // else if (token.type === Token.TYPE_COMMAND && token.value === "\\right(") {
    //     return new Token(Token.TYPE_RPAREN, "(");
    // }
    // else if (token.type === Token.TYPE_COMMAND && token.value === "\\left[") {
    //     return new Token(Token.TYPE_LPAREN, "[");
    // }
    // else if (token.type === Token.TYPE_COMMAND && token.value === "\\right]") {
    //     return new Token(Token.TYPE_RPAREN, "]");
    // }
    if (token.type === Token.TYPE_COMMAND && ["\\cdot", "\\times"].includes(token.value)) {
        return new Token(Token.TYPE_TIMES, "*");
    } else if (token.type === Token.TYPE_COMMAND && token.value === "\\log"){
        return new Token(Token.TYPE_COMMAND, "\\texlog");
	} else if (token.type === Token.TYPE_COMMAND && token.value === "\\sqrt"){
        return new Token(Token.TYPE_COMMAND, "\\texroot");
	}
	else if (token.type === Token.TYPE_COMMAND && token.value in texCharacters) {
		return new Token(Token.TYPE_SYMBOL, texCharacters[token.value]);		
	}
    return token;
};