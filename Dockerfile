FROM node:12
WORKDIR /usr/src/app
COPY ./dist/src/ ./
RUN npm install --only=prod
EXPOSE 80
EXPOSE 8080
CMD [ "node","index.js" ]