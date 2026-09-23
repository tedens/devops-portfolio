FROM node:22-alpine

# Non-root, matching the workload standard the compliance gate enforces on
# project 09. An example that runs as root is the example people copy.
WORKDIR /app
COPY src ./src

ARG BUILD_VERSION=dev
ARG FAIL_RATE=0

ENV BUILD_VERSION=${BUILD_VERSION}
ENV FAIL_RATE=${FAIL_RATE}
ENV PORT=8080

USER node
EXPOSE 8080

CMD ["node", "src/index.js"]
