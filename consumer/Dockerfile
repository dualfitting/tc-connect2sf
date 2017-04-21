FROM ubuntu
LABEL version="1.0"
LABEL description="Topcoder Salesforce Integration"



RUN apt-get update && apt-get upgrade -y && apt-get install -y cron logrotate curl
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get install -y nodejs

RUN apt-get install cron -y


# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app
# Install app dependencies
RUN npm install

RUN npm install -g forever babel-cli

RUN crontab config/scheduler-cron

RUN service cron start

EXPOSE 80

CMD forever -c "npm start" --uid "consumer"  .