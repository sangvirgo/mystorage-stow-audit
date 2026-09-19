FROM node:24-slim
WORKDIR /app
# No dependencies to install: the prototype uses only Node's standard library.
COPY package.json ./
COPY prompts ./prompts
COPY sources ./sources
COPY evals ./evals
COPY src ./src
# Run as the non-root "node" user (uid 1000) so files written to the mounted
# results/ and demo/ folders belong to the host user, not root.
RUN mkdir -p results demo && chown node:node results demo
USER node
CMD ["npm", "run", "eval"]
