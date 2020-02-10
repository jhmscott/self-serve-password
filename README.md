# Self Serve Password

This project is for organizations that use active directory as their central identity provider, but where users do not have regular access to computers. 

Examples include universities, where faculty computers are only used sparingly, and a student may want to update their password from a personal computer, since AD is used for so many other services. This also allows users to see which services are currently online with a list of servers, their descriptions and statuses. Finally the user is also given the ability to update their own contact info and profile picture (thumbnailPhoto).

To use this project, create a file named .env and fillout the following information 

AD_USERNAME=
AD_PASSWORD=
DC=

SERVER_OU=
USER_OU=OU=
CA_CRT=

ORGANIZATION_NAME=

APP_SECRET=
PORT=