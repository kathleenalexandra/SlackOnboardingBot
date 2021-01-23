const { createEventAdapter } = require("@slack/events-api");
const { WebClient } = require("@slack/web-api");
const app = require("express")();
const request = require("request");
const token = process.env.SLACK_TOKEN;
const slackSigningSecret = process.env.MY_SLACK_SIGNING_SECRET;
const port = process.env.PORT || 3000;
const slackEvents = createEventAdapter(slackSigningSecret);
const web = new WebClient(token);

app.use("/slack/events", slackEvents.expressMiddleware());
app.post("/events", slackEvents.requestListener());

// this resolves new certificate issue
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const schedule = require("node-schedule");
const botBlackList = [];
const userList = [];
var publicGif;

console.log("slack token" + token);
console.log("slackSigningSecret" + slackSigningSecret);
console.log("port" + port);

slackEvents.on("member_joined_channel", (event, body) => {
  if (event.channel == "CRC8BU796" || event.channel == "C024SUNCB") {
    console.log("user that joined" + event.user);
    userjoined(event.user);
    console.log("user joined chanel");
  } else {
    console.log("chanel funciton not working" + event.channel);
  }
});

findAllUsers();
function findAllUsers() {
  (async () => {
    try {
      /* get a list of all members of a chanel */
      const response = await web.users.list();
      for (var i = 0; i < response.members.length; i++) {
        for (var key in response.members[i]) {
          if (response.members[0].hasOwnProperty(key)) {
            if (key == "is_bot" && response.members[i][key] == true) {
              /* keep an array of bot users to exclude them from message broadcast */
              botBlackList.push(parseInt(i));
              if (botBlackList.includes(i) == true) {
              }
            }
          }
        }
      }
      /* loop through all valid users */ 
      for (var i = 0; i < response.members.length; i++) {
        for (var key in response.members[i]) {
          if (response.members[0].hasOwnProperty(key)) {
            if (key == "id") {
              if (botBlackList.includes(i) == false && i != 0) {
                userList.push(response.members[i][key]);
              }
            }
          }
        }
      }
      /* optionally set a timer to automate 
      timer(); */ 
    } catch (error) {
      if (error.code === ErrorCode.PlatformError) {
        console.log(error.data);
      } else {
        console.log("error");
      }
    }
  })();
}

/* function to run an automated cron job to remind users to do their timesheets */ 
function timer() {
  var j = schedule.scheduleJob("50 12 * * 5", function () {
    console.log("**********cron job ran successfully*********");
    userList.forEach(function (usr, index) {
      console.log(usr, index);
      timeSheetRemind(usr);
    });
  });
}


function gif(setGif) {
  publicGif = setGif;
}

function timeSheetRemind(validuser) {
  (async () => {
    request(
      "http://api.giphy.com/v1/gifs/search?q=timeb&api_key=t2oLyU69x5OzVQ6jn132AIsF5tOeEMUh",
      function (error, response, body) {
        var data = JSON.parse(body);
        var max = data.data.length;
        var min = 0;
        /* select a random "time" gif from giphy api */ 
        var randomNumber = Math.floor(Math.random() * (max - min)) + min;
        const gifUrl = data.data[randomNumber].images.downsized.url + "\n";
        gif(gifUrl);
      }
    );
    try {
      const response = await web.users.info({ user: validuser });
      slackUserName = response.user.name;
      console.log("called with" + response.user.name);
    } catch (error) {
      if (error.code === ErrorCode.PlatformError) {
        console.log(error.data);
      } else {
        console.log("error");
      }
    }

    const openChannel = await web.im.open({
      user: validuser,
    });

    const postToUser = await web.chat.postMessage({
      text: 'Hey ' + slackUserName + ' This is a friendly reminder to do your timesheets! \n' + publicGif,
      channel: openChannel.channel.id,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "This is a friendly reminder to do your timesheets!",
          },
        },
      ],
    });
  })();
}

function userjoined(newuser) {
  console.log("user id" + newuser);
  (async () => {
    try {
      const response = await web.users.info({ user: newuser });
      slackUserName = response.user.real_name;
    } catch (error) {
      if (error.code === ErrorCode.PlatformError) {
        console.log(error.data);
      } else {
        console.log("error");
      }
    }

    const openChannel = await web.im.open({
      user: newuser,
    });
    const postToUser = await web.chat.postMessage({
      text:
        "Welcome " +
        slackUserName,
      channel: openChannel.channel.id,
      attachments: [
        {
          fallback: "Onboarding deck",
          color: "#4AAB88",
          text:
            "\nLinkOne: http://samplelink.com ",
        },
      ],
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            text:
              "Welcome" +
              slackUserName,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "Here’s a link to start learning more about how we do things around here: <https://files.slack.com/files/onboarding.pdf|Onboarding PDF>",
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "Onboarding Deck",
            },
            url:
            // link to pdf here 
              "https://files.slack.com/files/onboarding.pdf",
          },
        },
      ],
    });
  })();
}

const server = app.listen(port);
slackEvents.on("error", (error) => {
  console.log(error.name);
});

app.get("*", (req, res) => {
  res.send("Slack Bot is working!");
});
