# photoServer
returns photos from a mongo gridFS database
request photos with {domain}/image/{filename}
you can check the servers performace with {domain}/status

image compression is taken care of automaticly
images can be reszed like the following
{domain}/image/{filename}?w=100h=100
where w is the width and h is the height

other options such as format are avalible

To get this working with your code change the database url
