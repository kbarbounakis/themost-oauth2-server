FROM node:carbon

# create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# copy application source
COPY . /usr/src/app

# install dependencies
RUN npm install
# build application
RUN npm run build

#set environment variables
ENV IP=0.0.0.0
ENV PORT=3000

EXPOSE 3000
CMD [ "npm", "start" ]