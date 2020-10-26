FROM node:12-alpine
LABEL Autor="PachoJGaviria (https://github.com/PachoJGaviria)"
ENV NODE_ENV production
RUN mkdir -p /usr/user/app && chown -R node:node /usr/user
USER node
WORKDIR /usr/user/app
COPY --chown=node:node ["package.json", "package-lock.json", ".npmrc", "./"]
RUN npm ci --production && mv node_modules ../ && npm cache clean --force
COPY --chown=node:node ./www ./src
EXPOSE 8080
ENTRYPOINT ["node", "src/server.js"]
