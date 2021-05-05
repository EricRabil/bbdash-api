FROM node:14-alpine

RUN yarn config set cache-folder /bbapi/.yarn-cache

COPY package.json .
COPY yarn.lock .
RUN yarn

ADD . ./

RUN yarn build

CMD ["node", "./dist/index.js"]