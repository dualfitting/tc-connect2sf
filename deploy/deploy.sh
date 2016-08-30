VER=$1.`date "+%Y%m%d%H%M"`
DOCKER_TAG="appiriodevops/tc-connect2sf:$VER"
DOCKER_TAG_SED="appiriodevops\/tc-connect2sf:$VER"

./docker-build.sh $DOCKER_TAG

docker push $DOCKER_TAG

cat tc-connect2sf.yml.template | sed s/@@DOCKER_TAG@@/$DOCKER_TAG_SED/g > tc-connect2sf.yml

./ecs-deploy.sh tc-$1
