# List of TODO items

## NEXT
- session based running instead of static registry /  clear up states --> remove global registries...
- convert RegistryManager for setup_devices_registry
- implement steering direction for distance as well
- keep BlockValue actual contained type: string/num/bool/unknown and perform conversions based on this / leave some float_safe / str out, get raw(acceps: string / string|num)

## LATER
- handle multi port Motor
- handle AUTO port Motor and sensor
- horizonal block - handle all motor(s) attached to the Hub
- multi_motor - create a port based dict on default speeds
- some converters cannot handle dynamic expressions and variables (e.g. global brightness)
- add animations (manifest.animations{}.params{transition=2,frames[{pixels:[0..1.0],loop,fps,animationName
- block size estimation - h=40, w=350 is one unit approx
- more jest tests to be added
