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

RUN npm install -g forever

#EXPOSE 3000

CMD forever start -c "npm start" --uid "consumer"  .