FROM node:6.9.4
LABEL version="1.0"
LABEL description="Topcoder Salesforce Integration"

RUN apt-get update && \
    apt-get upgrade -y


# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app
# Install app dependencies
RUN npm install

EXPOSE 80

CMD npm start