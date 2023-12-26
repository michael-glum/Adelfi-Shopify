FROM node:18-alpine

# Install bash
RUN apk add --no-cache bash

EXPOSE 8080
WORKDIR /app
COPY . .

# Make sure the script is executable
RUN chmod +x ./start_with_migrations.sh

#ARG LITEFS_CONFIG=litefs.yml

#COPY --from=flyio/litefs:0.5 /usr/local/bin/litefs /usr/local/bin/litefs

#ADD etc/litefs.yml /tmp/litefs.yml

#RUN cp /tmp/$LITEFS_CONFIG /etc/litefs.yml

#RUN apk add bash fuse3 sqlite ca-certificates curl

# Copy certificate file into the container
COPY ca.pem /usr/local/share/ca-certificates/ca.pem

# Update the certificates
RUN apk update && \
    apk add --no-cache ca-certificates && \
    update-ca-certificates

RUN npm install
RUN npm run build

# You'll probably want to remove this in production, it's here to make it easier to test things!
RUN rm -f prisma/dev.sqlite

#ENTRYPOINT litefs mount

CMD ["./start_with_migrations.sh"]
