FROM node:20-bookworm-slim AS deps
RUN apt-get update && apt-get upgrade -y
WORKDIR /home/node/www

ENV YARN_CACHE_FOLDER=/home/node/.yarn \
  NODE_OPTIONS=--max-old-space-size=8196

RUN chown -R node:node $(pwd) && corepack enable
RUN --mount=type=cache,target=/home/node/.yarn
USER node

COPY --chown=node:node package.json yarn.lock .yarnrc.yml yarn-prune.js ./
RUN yarn --immutable


FROM deps AS dist
COPY --chown=node:node . .
RUN yarn build


FROM deps AS dev_api
EXPOSE 3000
CMD ["yarn", "tsx", "--watch", "src/api/index.ts"]


FROM deps AS dev_workers
CMD ["yarn", "tsx", "--watch", "src/workers/index.ts"]


FROM deps as prod_build
RUN yarn docker-prod-prune && yarn cache clean
COPY --chown=node:node --from=dist /home/node/www/dist /home/node/www/dist


FROM prod_build as prod_api
EXPOSE 3000
CMD ["node", "dist/api/index.js"]


FROM prod_build as prod_workers
CMD ["node", "dist/workers/index.js"]
