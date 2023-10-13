FROM node:18-alpine

EXPOSE 8081
WORKDIR /app
COPY . .

ARG LITEFS_CONFIG=litefs.yml

COPY --from=flyio/litefs:0.5 /usr/local/bin/litefs /usr/local/bin/litefs

ADD etc/litefs.yml /tmp/litefs.yml

RUN cp /tmp/$LITEFS_CONFIG /etc/litefs.yml

RUN apk add bash fuse3 sqlite ca-certificates curl

RUN npm install
RUN npm run build

# You'll probably want to remove this in production, it's here to make it easier to test things!
RUN rm -f prisma/dev.sqlite

ENTRYPOINT litefs mount

# CMD ["npm", "run", "docker-start"]
