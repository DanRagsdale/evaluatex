import Token from "./Token";
import arities from "./util/arities";
import localFunctions from "./util/localFunctions";
import replaceToken from './util/replaceToken';

// Single-arg tokens are those that, when in LaTeX mode, read only one character as their argument OR a block delimited by { }. For example, `x ^ 24` would be read as `SYMBOL(x) POWER NUMBER(2) NUMBER(4).
const CHAR_ARG_TOKENS = [Token.TYPE_POWER, Token.TYPE_COMMAND];
const CHAR_ARG_COMMANDS = ["\\frac", "\\texroot"];

const DEFAULT_OPTS = {
    latex: false
};

/**
 * The lexer reads a math expression and breaks it down into easily-digestible Tokens.
 * A list of valid tokens can be found lower in this file.
 * @param equation (String) The equation to lex.
 * @param constants (Object) An object of functions and variables.
 * @param opts Options.
 * @returns {Array} An array of Tokens.
 */
export default function lexer(equation, constants = {}, opts = DEFAULT_OPTS) {
    let l = new Lexer(equation, constants, opts);
    l.lex();

    // toString() each token and concatenate into a big string. Useful for debugging.
    l.tokens.toString = () => l.tokens.map(token => token.toString()).join(" ");

    return l.tokens;
}

class Lexer {
    constructor(buffer, constants, opts) {
        this.buffer = buffer;
        this.constants = Object.assign({}, constants, localFunctions);
        this.opts = opts;
        this.tokens = [];
    }

    lex() {
        this.lexExpression();
        this.replaceConstants();
        this.replaceCommands();
    }

    /**
     * Lexes an expression or sub-expression.
     */
    lexExpression(charMode = false, squareBracketMode = false) {
		// Deletes whitespace first and then checks if there are tokens left.
        while (true) {
			this.skipWhitespace()
			if (!this.hasNext()) {
				break;
			}

            let token = replaceToken(charMode ? this.nextCharToken() : this.next());
            this.tokens.push(token);

			/* Handle LaTeX commands with optional arguments*/ 
			if (token.type === Token.TYPE_COMMAND && token.value === "\\texlog"){
				if (this.buffer[0] === "_") {
					this.tokens.push(new Token(Token.TYPE_SYMBOL, "_"));
					this.buffer = this.buffer.substring(1);
					this.lexExpression(true);
				}
			} else if (token.type === Token.TYPE_COMMAND && token.value === "\\texroot") {
				if (this.buffer[0] === "[") {
					this.lexExpression(false, true);
				}
			}

            if (this.opts.latex && isCharArgToken(token)) {
                let arity = 1;
                if (token.type === Token.TYPE_COMMAND) {
                    arity = arities[token.value.substring(1).toLowerCase()];
                }

                for (let i = 0; i < arity; i++) {
                    this.lexExpression(true);
                }
            }
            else if (isStartGroupToken(token)) {
                this.lexExpression(false);
            }

            if (charMode || isEndGroupToken(token)) {
                return;
            }
			else if (squareBracketMode && token.type === Token.TYPE_RPAREN && token.value === "]") {
				return;
			}
        }
    }

    hasNext() {
        return this.buffer.length > 0;
    }

    /**
     * Retrieves the next non-whitespace token from the buffer.
     * @param len
     * @returns {Token}
     */
    next(len = undefined) {
        if (!this.hasNext()) {
            throw "Lexer error: reached end of stream";
        }

        // Try to match each pattern in tokenPatterns to the remaining buffer
        for (const [type, regex] of Token.patterns) {
            // Force the regex to match only at the beginning of the string
            const regexFromStart = new RegExp(/^/.source + regex.source, regex.flags);
			//console.log(regexFromStart);

            // When `len` is undefined, substr reads to the end
            let match = regexFromStart.exec(this.buffer.substr(0, len));
            if (match) {
                this.buffer = this.buffer.substr(match[0].length);
                return new Token(type, match[0]);
            }
        }

        // TODO: Meaningful error
        throw "Lexer error: can't match any token";
    }

    /**
     * Tokenizes the next single character of the buffer, unless the following token is a LaTeX command, in which case the entire command is tokenized.
     */
    nextCharToken() {
        if (this.buffer.charAt(0) === "\\") {
            return this.next();
        }
        return this.next(1);
    }

    replaceCommands() {
        for (const token of this.tokens) {
            if (token.type === Token.TYPE_COMMAND) {
                token.value = token.value.substr(1).toLowerCase();
                token.name = token.value; // Save name of function for debugging later
                token.value = this.constants[token.name];
            }
        }
    }

    replaceConstants() {
        for (const token of this.tokens) {
            if (token.type === Token.TYPE_SYMBOL) {
                // Symbols will need to be looked up during the evaluation phase.
                // If the symbol refers to things defined in either Math or
                // the locals, compile them, to prevent slow lookups later.
                if (typeof this.constants[token.value] === "function") {
                    token.type = Token.TYPE_FUNCTION;
                    token.name = token.value; // Save name of function for debugging later
                    token.value = this.constants[token.value];
                }
                else if (typeof this.constants[token.value] === "number") {
                    token.type = Token.TYPE_NUMBER;
                    token.value = token.fn = this.constants[token.value];
                }
            }
        }
    }

    /**
     * Removes whitespace from the beginning of the buffer.
     */
    skipWhitespace() {
        const regex = new RegExp(/^/.source + Token.patterns.get(Token.TYPE_WHITESPACE).source);
		this.buffer = this.buffer.replace(regex, "");
    }
}

export const isCharArgToken = function isCharArgToken(token) {
	if (CHAR_ARG_TOKENS.indexOf(token.type) === -1) {
		return false;
	};
	// LaTeX functions like \\sin 10 should treat 10 as a single argument
	if (token.type === Token.TYPE_COMMAND && CHAR_ARG_COMMANDS.indexOf(token.value) === -1) {
		return false
	}
	return true;
}

function isStartGroupToken(token) {
    return token.type === Token.TYPE_LPAREN && token.value === "{";
}

function isEndGroupToken(token) {
    return token.type === Token.TYPE_RPAREN && token.value === "}";
}
