window.donumerov = (function(g) {
/*
-- Author: Matt Evans (mtdevans.com)
-- Version: 2013-07-09
-- Copyright: None.
*/

var num_solve_for = 3; // How many solutions
var h = 0.04; // Integration step. Increasing this makes for accurate results but eats CPU. This*N gives x-axis extrema.
var h2 = Math.pow(h,2); // Optimization ftw

var N = 150; // The number of (+/- x)-values to evaluate

var precision = 10; // Decimal places of precision for eigenvalues (JavaScript's intrinsic number precision notwithstanding)

var epsilon = 0; // Seems like a good place to start
var epsilon_step = 1; // Initial epsilon step, kind of irrelevant though...
var small_step = 0; // ...because of this, used for precision determination
var small_step_val = 0;

var good_e = []; // Stores values of epsilon
var good_x = [];
var good_y = [];

var last_x = [];
var last_y = [];
var last_sign = true; // Sign of the infinity; true = positive.

var do_numerov = function() {
  var y = 0;
  var k = 0;
  var n=-1*N+2; // Seed the algorithm with the first two values...
  var x = n*h; // ...because S.E. is 2nd order -> 2 unknowns!

  // Determines y-axis scale, these values make the solutions look nice together
  var a = [0.011, 0.09, 0.5, 1.9, 7, 19, 27, 28, 29, 30];

  var k_minus_2 = (epsilon) + x-2*h; // k_0
  var k_minus_1 = (epsilon) + x-h; // k_1

  var y_minus_2 = 0; // y_0
  var y_minus_1 = a[good_e.length]; // y_1

  var x_out = [x-h, x];
  var y_out = [y_minus_2, y_minus_1];

  while (n < N) {
    n += 1;
    x += h;
    k = 2*epsilon - Math.pow(x,2);
    b = h2/12;
    y = ( 2*(1-5*b*k_minus_1) * y_minus_1 - (1+b*k_minus_2) * y_minus_2 ) / (1 + b * k);

   // Save for plotting
    x_out.push(x);
    y_out.push(y);

   // Shift for next iteration
    y_minus_2 = y_minus_1;
    y_minus_1 = y;
    k_minus_2 = k_minus_1;
    k_minus_1 = k;
  }

  // Check if crazy behaviour at end:
  var behaviour = true; // Set as positive
  if (y_out[y_out.length-1] < 0)
    behaviour = false; // Change if not
  if (behaviour != last_sign) { // Interesting, tell me more...
    if (small_step == precision) { // Found one!
      console.log("So, we found one: ε=" + (epsilon+small_step_val));
      // Save these
      good_e.push(epsilon+small_step_val);
      good_x.push(last_x);
      good_y.push(last_y);
      // Reset
      epsilon_step = 0.1;
      epsilon += Math.pow(-1,small_step)*2*small_step_val; // Nudge it back over the sign change
      while (small_step>0) {small_step--;behaviour = !behaviour;} // And rectify the sign accordingly (definitely optimizable, this line!)
      small_step_val = 0;
    }else{ // Iterate backwards till it changes again
      small_step++;
      small_step_val = Math.pow(-1, small_step)*Math.pow(10,-1*(1+small_step));
      epsilon_step = small_step_val;
    }
  }

  last_sign = behaviour;
  last_x = x_out;
  last_y = y_out;

  // This is for the plotting of the (almost eigen)functions as they are being processed
  var ds = [];
  if (good_e.length<num_solve_for) ds.push({x:last_x,y:last_y,options:'o,wl:false,col:#f48'});
  for (var j=0;j<good_x.length;j++) ds.push({x:good_x[j],y:good_y[j]});
  g.plot(ds);

  delete x_out;
  delete y_out;
  epsilon += epsilon_step;

  if (good_e.length<num_solve_for) {
    setTimeout(do_numerov, 20); // 20-millisecond-long frames. If it's too fast (slow), shift this up (down).
  }
}

do_numerov();

});
