ssh -i ~/.ssh/<key>.pem ubuntu@<EC2_IP>
sudo apt-get update -y && sudo apt-get install -y mysql-client   # if not already there

# get the endpoint from the API's env (or terraform output rds_endpoint)
grep DB_HOST ~/app/api/.env

ENDPOINT=<that rds endpoint>
mysql -h $ENDPOINT -u admin -p            < ~/app/db/schema.sql
mysql -h $ENDPOINT -u admin -p school_app < ~/app/db/seed.sql
mysql -h $ENDPOINT -u admin -p school_app < ~/app/db/dummy_students.sql