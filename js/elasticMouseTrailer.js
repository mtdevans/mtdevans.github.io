(function(){
/*
Multi-Instantiable Elastic Mouse Trailer v0.1
By: Matt Evans, mtdevans.com
Date: 2013/04/13
Depends on: jQuery
Released under CC0 Licence

Usage Example:
CSS:
div.trailItem {
  position:absolute;
}
JS:
var newTrail = new emt({
                        num:5,
                        gravity:9.81,
                        mass:40,
                        k:4000,
                        damping:0.3,
                        gravityAngle:90
                        });
*/

var emt = window.emt = function(config) {
  this.num = config.num || 3;
  this.gravity = config.gravity || 9.81; // Acceleration due to gravity in metres per second per second
  this.frameRate = config.frameRate || 20; // Milliseconds per frame
  this.spacing = config.spacing || 5; // Rest length of elastic in units we'll call cm
  this.mass = config.mass || 25; // Mass in kg
  this.k = config.k || 1000; // Elastic coefficient in N/m (ie stiffness)
  this.damping = config.damping || 0.4; // Fraction damping per oscillation
  this.gravityAngle = config.gravityAngle || 0; // 0 degrees is down

  // Initialize some variables
  this.items = new Array();

  // Update window.mouse with x/y coords of cursor
  this.trackMousePosition();

  // Create the items
  for (var i=0;i<this.num;i++) {
    var z = this.items.length;
    this.items[z] = jQuery("<div class=\"trailItem\">*</div>");
    this.items[z].X = function() {return Math.floor(this.x);};
    this.items[z].Y = function() {return Math.floor(this.y);};
    this.items[z].parent = (i==0?window.mouseCtl:this.items[z-1]);
    // Initialize some variables here to make the code easier to read later on (no existance checking required)
    this.items[z].state = {'left':[window.mouse.x, 0], 'top':[window.mouse.y, 0]}; // Position, velocity <-- stores the relative value of position (relative to its parent)
    this.items[z].x = window.mouse.x; // Stores the absolute, screen value of position
    this.items[z].y = window.mouse.y;
    this.items[z].stretch = {'x':0,'y':0,'xy':0};
  }

  this.draw();
};

emt.prototype = {
  // Draws trailer elements
  draw : function() {
    for (var i=0;i<this.items.length;i++) {
      jQuery("body").append(this.items[i]);
    }
    // Using jQuery.proxy gets around the context problem with `this` and setInterval
    // See: http://stackoverflow.com/questions/2130241/pass-correct-this-context-to-settimeout-callback
    this.interval = setInterval(jQuery.proxy(this.trackCursor, this), this.frameRate);
  },
  // Translated from: http://doswa.com/2009/01/02/fourth-order-runge-kutta-numerical-integration.html
  rk4 : function(x, v, a, dt) {
    // Returns final (position, velocity) array after time dt has passed.
    //        x: initial position
    //        v: initial velocity
    //        a: acceleration function a(x,v,dt) (must be callable)
    //        dt: timestep
    var x1 = x;
    var v1 = v;
    var a1 = a.call(this, x1, v1, 0); // Using .call(obj, arg1, arg2,...) to keep the context for `this`

    var x2 = x + 0.5*v1*dt;
    var v2 = v + 0.5*a1*dt;
    var a2 = a.call(this, x2, v2, dt/2);

    var x3 = x + 0.5*v2*dt;
    var v3 = v + 0.5*a2*dt;
    var a3 = a.call(this, x3, v3, dt/2);

    var x4 = x + v3*dt;
    var v4 = v + a3*dt;
    var a4 = a.call(this, x4, v4, dt);

    var xf = x + (dt/6)*(v1 + 2*v2 + 2*v3 + v4);
    var vf = v + (dt/6)*(a1 + 2*a2 + 2*a3 + a4);

    return [xf, vf];
  },
  // Follows the cursor
  trackCursor : function() {
    if (this.items) {
      for (var i=0;i<this.items.length;i++) {
        var dt = this.frameRate/1000; // Milliseconds to seconds - we're dealing with SI units (kind of)

        // Making these local just as shorthand
        var stretch = this.items[i].stretch;
        var state = this.items[i].state;

        // If parent has moved, find position again.
        state.left[0] = this.items[i].x - this.items[i].parent.X();
        state.top[0] = this.items[i].y - this.items[i].parent.Y();

        // Work out stretch in elastic
        // For this demo, it's simply the distance from the centre of oscillation (ie the parent's position)
        stretch.x = state.left[0];
        stretch.y = state.top[0];
        // To make the elastic loose under compression, set to zero if .spacing > .sqrt(~)
        stretch.xy = Math.sqrt(stretch.x * stretch.x + stretch.y * stretch.y) - this.spacing;
        stretch.theta = Math.atan2(stretch.y, stretch.x);

        this.items[i].stretch = stretch;

        // Keep a reference for comparison later on
        var lastState = [state.left, state.top];

        // Using .call(this, ...) to keep context inside the function
        state.left = this.rk4.call(this, state.left[0], state.left[1], (function(x, v, dt) {
             // This is the acceleration function
             //   gravity contribution - (k/mass * stretch * cos(theta) + damping/mass * velocity)
             return 100*this.gravity*Math.cos(Math.PI/2+this.gravityAngle*Math.PI/180)+(-this.k*(this.items[i].stretch.xy*Math.cos(this.items[i].stretch.theta))-1000*this.damping*v)/this.mass;

        }), dt);

        state.top = this.rk4.call(this, state.top[0], state.top[1], (function(x, v, dt) {
             // This is the acceleration function
             //   gravity contribution - (k/mass * stretch * sin(theta) + damping/mass * velocity)
             // Some might call the random powers of ten hacks.
             return 100*this.gravity*Math.sin(Math.PI/2+this.gravityAngle*Math.PI/180)-(this.k*(this.items[i].stretch.xy*Math.sin(this.items[i].stretch.theta))+1000*this.damping*v)/this.mass;

        }), dt);

        // How much the item has moved since the last run-through
        var delta = {};
        delta.x = state.left[0] - lastState[0][0];
        delta.y = state.top[0] - lastState[1][0];

        // Increase/decrease by that amount
        this.items[i].x += delta.x;
        this.items[i].y += delta.y;

        // Move item into position
        this.items[i].css("top", this.items[i].y);
        this.items[i].css("left", this.items[i].x);
      }
    }
  },
  // Updates the location of the cursor
  trackMousePosition : function() {
    window.mouse = window.mouse || {'x':0,'y':0};
    // This becomes the first item's parent
    window.mouseCtl = {
      X : function() { return window.mouse.x; },
      Y : function() { return window.mouse.y; }
    };
    window.addEventListener("mousemove", function(e) {
      var m = e.pageX!=undefined?[e.pageX,e.pageY]:[window.event.clientX,window.event.clientY];
      m[0] = m[0]>0?m[0]:0;
      m[1] = m[1]>0?m[1]:0;
      window.mouse = {'x':m[0],'y':m[1]};
    });
  },
  destroy : function() {
    window.clearInterval(this.interval);
    delete this.interval;
    for (var i=0;i<this.items.length;i++) {
      this.items[i].remove();
    }
  }
};
})();
