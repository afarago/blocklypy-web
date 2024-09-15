# List of TODO items

## NEXT
- multi motor handlers
- session based running instead of static registry / clear up states --> remove global registries...
- convert RegistryManager for variables and procedures

## LATER
- variables, lists, broadcasts - registry by id, also handling duplicates
- some converters cannot handle dynamic expressions and variables (e.g. global brightness)
- optimize comments
- add animations (manifest.animations{}.params{transition=2,frames[{pixels:[0..1.0],loop,fps,animationName
- block size estimation - h=40, w=350 is one unit approx
- handle multi port Motor
- handle AUTO port Motor and sensor
- handle global motor_auto_default_speed in stacks when assigning (global), should be at the start of the def!
- horizonal block -- all motor(s) attached to the Hub
- multi_motor - create a port based dict on default speeds
