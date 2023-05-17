/**
 * ES6 port from: https://github.com/psychrometrics/psychrolib
 * by Matthias Kallenbach
 *
 * Steps to reproduce
 *
 * - standard functions in main scope
 * - "global" variables in main scope
 * - PSYCHROLIB_UNITS + PSYCHROLIB_TOLERANCE in object scope (this.PSY...)
 * - transform function header
 * - var replaced with const / let
 */

// Standard functions
const log = Math.log;
const exp = Math.exp;
const pow = Math.pow;
const min = Math.min;
const max = Math.max;
const abs = Math.abs;

/******************************************************************************************************
 * Global constants
 *****************************************************************************************************/

// Zero degree Fahrenheit (°F) expressed as degree Rankine (°R).
// Reference: ASHRAE Handbook - Fundamentals (2017) ch. 39.
const ZERO_FAHRENHEIT_AS_RANKINE = 459.67;

// Zero degree Celsius (°C) expressed as Kelvin (K).
// Reference: ASHRAE Handbook - Fundamentals (2017) ch. 39.
const ZERO_CELSIUS_AS_KELVIN = 273.15;

// Universal gas constant for dry air (IP version) in ft lb_Force lb_DryAir⁻¹ R⁻¹.
// Reference: ASHRAE Handbook - Fundamentals (2017) ch. 1.
const R_DA_IP = 53.350;

// Universal gas constant for dry air (SI version) in J kg_DryAir⁻¹ K⁻¹.
// Reference: ASHRAE Handbook - Fundamentals (2017) ch. 1.
const R_DA_SI = 287.042;

// Invalid value (dimensionless).
const INVALID = -99999;

// Maximum number of iterations before exiting while loops.
const MAX_ITER_COUNT = 100;

// Minimum acceptable humidity ratio used/returned by any functions.
// Any value above 0 or below the MIN_HUM_RATIO will be reset to this value.
const MIN_HUM_RATIO = 1e-7;

// Freezing point of water in Fahrenheit.
const FREEZING_POINT_WATER_IP = 32.0;

// Freezing point of water in Celsius.
const FREEZING_POINT_WATER_SI = 0.0;

// Triple point of water in Fahrenheit.
const TRIPLE_POINT_WATER_IP = 32.018;

// Triple point of water in Celsius.
const TRIPLE_POINT_WATER_SI = 0.01;

// Systems of units (IP or SI)
const PSYCHROLIB_UNITS = undefined;

// Floating-point tolerance value
const PSYCHROLIB_TOLERANCE = undefined;

/******************************************************************************************************
 * The class
 *****************************************************************************************************/

export default class Psychrometrics {

    constructor() {
        this.IP = 1;
        this.SI = 2;
        this.PSYCHROLIB_UNITS = PSYCHROLIB_UNITS;
        this.PSYCHROLIB_TOLERANCE = PSYCHROLIB_TOLERANCE;
    }

    /******************************************************************************************************
     * Helper functions
     *****************************************************************************************************/

    SetUnitSystem(UnitSystem) {
        if (UnitSystem !== this.IP && UnitSystem !== this.SI) {
            throw new Error('UnitSystem must be IP or SI');
        }
        this.PSYCHROLIB_UNITS = UnitSystem;
        // Define tolerance of temperature calculations
        // The tolerance is the same in IP and SI
        if (this.PSYCHROLIB_UNITS === this.IP)
            this.PSYCHROLIB_TOLERANCE = 0.001 * 9. / 5.;
        else
            this.PSYCHROLIB_TOLERANCE = 0.001;
    }

    GetUnitSystem() {
        return this.PSYCHROLIB_UNITS;
    }

    isIP() {
        if (this.PSYCHROLIB_UNITS === this.IP)
            return true;
        else if (this.PSYCHROLIB_UNITS === this.SI)
            return false;
        else
            throw new Error("Unit system is not defined");
    }

    /******************************************************************************************************
     * Conversion between temperature units
     *****************************************************************************************************/

    GetTRankineFromTFahrenheit(T_F) {
        return T_F + ZERO_FAHRENHEIT_AS_RANKINE;
    }

    GetTFahrenheitFromTRankine(T_R) {
        return T_R - ZERO_FAHRENHEIT_AS_RANKINE;
    }

    GetTKelvinFromTCelsius(T_C) {
        return T_C + ZERO_CELSIUS_AS_KELVIN;
    }

    GetTCelsiusFromTKelvin(T_K) {
        return T_K - ZERO_CELSIUS_AS_KELVIN;
    }

    /******************************************************************************************************
     * Conversions between dew point, wet bulb, and relative humidity
     *****************************************************************************************************/

    GetTWetBulbFromTDewPoint // (o) Wet bulb temperature in °F [IP] or °C [SI]
    (TDryBulb                              // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , TDewPoint                             // (i) Dew point temperature in °F [IP] or °C [SI]
        , Pressure                              // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let HumRatio;

        if (!(TDewPoint <= TDryBulb))
            throw new Error("Dew point temperature is above dry bulb temperature");

        HumRatio = this.GetHumRatioFromTDewPoint(TDewPoint, Pressure);
        return this.GetTWetBulbFromHumRatio(TDryBulb, HumRatio, Pressure);
    }

    GetTWetBulbFromRelHum// (o) Wet bulb temperature in °F [IP] or °C [SI]
    (TDryBulb                          // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , RelHum                            // (i) Relative humidity [0-1]
        , Pressure                          // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let HumRatio;

        if (!(RelHum >= 0. && RelHum <= 1.))
            throw new Error("Relative humidity is outside range [0,1]");

        HumRatio = this.GetHumRatioFromRelHum(TDryBulb, RelHum, Pressure);
        return this.GetTWetBulbFromHumRatio(TDryBulb, HumRatio, Pressure);
    }

    GetRelHumFromTDewPoint // (o) Relative humidity [0-1]
    (TDryBulb                            // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , TDewPoint                           // (i) Dew point temperature in °F [IP] or °C [SI]
    ) {
        let VapPres, SatVapPres;

        if (!(TDewPoint <= TDryBulb))
            throw new Error("Dew point temperature is above dry bulb temperature");

        VapPres = this.GetSatVapPres(TDewPoint);
        SatVapPres = this.GetSatVapPres(TDryBulb);
        return VapPres / SatVapPres;
    }

    GetRelHumFromTWetBulb// (o) Relative humidity [0-1]
    (TDryBulb                          // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , TWetBulb                          // (i) Wet bulb temperature in °F [IP] or °C [SI]
        , Pressure                          // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let HumRatio;

        if (!(TWetBulb <= TDryBulb))
            throw new Error("Wet bulb temperature is above dry bulb temperature");

        HumRatio = this.GetHumRatioFromTWetBulb(TDryBulb, TWetBulb, Pressure);
        return this.GetRelHumFromHumRatio(TDryBulb, HumRatio, Pressure);
    }

    GetTDewPointFromRelHum // (o) Dew Point temperature in °F [IP] or °C [SI]
    (TDryBulb                            // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , RelHum                              // (i) Relative humidity [0-1]
    ) {
        let VapPres;

        if (!(RelHum >= 0. && RelHum <= 1.))
            throw new Error("Relative humidity is outside range [0,1]");

        VapPres = this.GetVapPresFromRelHum(TDryBulb, RelHum);
        return this.GetTDewPointFromVapPres(TDryBulb, VapPres);
    }

    GetTDewPointFromTWetBulb // (o) Dew Point temperature in °F [IP] or °C [SI]
    (TDryBulb                              // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , TWetBulb                              // (i) Wet bulb temperature in °F [IP] or °C [SI]
        , Pressure                              // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let HumRatio;

        if (!(TWetBulb <= TDryBulb))
            throw new Error("Wet bulb temperature is above dry bulb temperature");

        HumRatio = this.GetHumRatioFromTWetBulb(TDryBulb, TWetBulb, Pressure);
        return this.GetTDewPointFromHumRatio(TDryBulb, HumRatio, Pressure);
    }

    /******************************************************************************************************
     * Conversions between dew point, or relative humidity and vapor pressure
     *****************************************************************************************************/

    GetVapPresFromRelHum // (o) Partial pressure of water vapor in moist air in Psi [IP] or Pa [SI]
    (TDryBulb                          // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , RelHum                            // (i) Relative humidity [0-1]
    ) {

        if (!(RelHum >= 0. && RelHum <= 1.))
            throw new Error("Relative humidity is outside range [0,1]");

        return RelHum * this.GetSatVapPres(TDryBulb);
    }

    GetRelHumFromVapPres // (o) Relative humidity [0-1]
    (TDryBulb                          // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , VapPres                           // (i) Partial pressure of water vapor in moist air in Psi [IP] or Pa [SI]
    ) {

        if (!(VapPres >= 0.))
            throw new Error("Partial pressure of water vapor in moist air is negative");

        return VapPres / this.GetSatVapPres(TDryBulb);
    }

    dLnPws_(TDryBulb) {
        let dLnPws, T;

        if (this.isIP()) {
            T = this.GetTRankineFromTFahrenheit(TDryBulb);

            if (TDryBulb <= TRIPLE_POINT_WATER_IP)
                dLnPws = 1.0214165E+04 / pow(T, 2) - 5.3765794E-03 + 2 * 1.9202377E-07 * T
                    + 3 * 3.5575832E-10 * pow(T, 2) - 4 * 9.0344688E-14 * pow(T, 3) + 4.1635019 / T;
            else
                dLnPws = 1.0440397E+04 / pow(T, 2) - 2.7022355E-02 + 2 * 1.2890360E-05 * T
                    - 3 * 2.4780681E-09 * pow(T, 2) + 6.5459673 / T;
        } else {
            T = this.GetTKelvinFromTCelsius(TDryBulb);

            if (TDryBulb <= TRIPLE_POINT_WATER_SI)
                dLnPws = 5.6745359E+03 / pow(T, 2) - 9.677843E-03 + 2 * 6.2215701E-07 * T
                    + 3 * 2.0747825E-09 * pow(T, 2) - 4 * 9.484024E-13 * pow(T, 3) + 4.1635019 / T;
            else
                dLnPws = 5.8002206E+03 / pow(T, 2) - 4.8640239E-02 + 2 * 4.1764768E-05 * T
                    - 3 * 1.4452093E-08 * pow(T, 2) + 6.5459673 / T;
        }

        return dLnPws;
    }

    GetTDewPointFromVapPres// (o) Dew Point temperature in °F [IP] or °C [SI]
    (TDryBulb                            // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , VapPres                             // (i) Partial pressure of water vapor in moist air in Psi [IP] or Pa [SI]
    ) {
        // Bounds function of the system of units
        let BOUNDS;              // Domain of validity of the equations

        if (this.isIP()) {
            BOUNDS = [-148., 392.];   // Domain of validity of the equations
        } else {
            BOUNDS = [-100., 200.];   // Domain of validity of the equations
        }

        // Bounds outside which a solution cannot be found
        if (VapPres < this.GetSatVapPres(BOUNDS[0]) || VapPres > this.GetSatVapPres(BOUNDS[1]))
            throw new Error("Partial pressure of water vapor is outside range of validity of equations");

        // We use NR to approximate the solution.
        // First guess
        let TDewPoint = TDryBulb;      // Calculated value of dew point temperatures, solved for iteratively in °F [IP] or °C [SI]
        const lnVP = log(VapPres);       // Natural logarithm of partial pressure of water vapor pressure in moist air

        let TDewPoint_iter;            // Value of TDewPoint used in NR calculation
        let lnVP_iter;                 // Value of log of vapor water pressure used in NR calculation
        let index = 1;
        do {
            // Current point
            TDewPoint_iter = TDewPoint;
            lnVP_iter = log(this.GetSatVapPres(TDewPoint_iter));

            // Derivative of function, calculated analytically
            const d_lnVP = this.dLnPws_(TDewPoint_iter);

            // New estimate, bounded by domain of validity of eqn. 5 and 6
            TDewPoint = TDewPoint_iter - (lnVP_iter - lnVP) / d_lnVP;
            TDewPoint = max(TDewPoint, BOUNDS[0]);
            TDewPoint = min(TDewPoint, BOUNDS[1]);

            if (index > MAX_ITER_COUNT)
                throw new Error("Convergence not reached in GetTDewPointFromVapPres. Stopping.");

            index++;
        }
        while (abs(TDewPoint - TDewPoint_iter) > this.PSYCHROLIB_TOLERANCE);
        return min(TDewPoint, TDryBulb);
    }

    GetVapPresFromTDewPoint// (o) Partial pressure of water vapor in moist air in Psi [IP] or Pa [SI]
    (TDewPoint                           // (i) Dew point temperature in °F [IP] or °C [SI]
    ) {
        return this.GetSatVapPres(TDewPoint);
    }

    /******************************************************************************************************
     * Conversions from wet-bulb temperature, dew-point temperature, or relative humidity to humidity ratio
     *****************************************************************************************************/

    GetTWetBulbFromHumRatio// (o) Wet bulb temperature in °F [IP] or °C [SI]
    (TDryBulb                            // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , HumRatio                            // (i) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
        , Pressure                            // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        // Declarations
        let Wstar;
        let TDewPoint, TWetBulb, TWetBulbSup, TWetBulbInf, BoundedHumRatio;
        let index = 1;

        if (!(HumRatio >= 0.))
            throw new Error("Humidity ratio is negative");
        BoundedHumRatio = max(HumRatio, MIN_HUM_RATIO);

        TDewPoint = this.GetTDewPointFromHumRatio(TDryBulb, BoundedHumRatio, Pressure);

        // Initial guesses
        TWetBulbSup = TDryBulb;
        TWetBulbInf = TDewPoint;
        TWetBulb = (TWetBulbInf + TWetBulbSup) / 2.;

        // Bisection loop
        while ((TWetBulbSup - TWetBulbInf) > this.PSYCHROLIB_TOLERANCE) {
            // Compute humidity ratio at temperature Tstar
            Wstar = this.GetHumRatioFromTWetBulb(TDryBulb, TWetBulb, Pressure);

            // Get new bounds
            if (Wstar > BoundedHumRatio)
                TWetBulbSup = TWetBulb;
            else
                TWetBulbInf = TWetBulb;

            // New guess of wet bulb temperature
            TWetBulb = (TWetBulbSup + TWetBulbInf) / 2.;

            if (index > MAX_ITER_COUNT)
                throw new Error("Convergence not reached in GetTWetBulbFromHumRatio. Stopping.");

            index++;
        }

        return TWetBulb;
    }

    GetHumRatioFromTWetBulb// (o) Humidity Ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
    (TDryBulb                            // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , TWetBulb                            // (i) Wet bulb temperature in °F [IP] or °C [SI]
        , Pressure                            // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let Wsstar;
        let HumRatio = INVALID;

        if (!(TWetBulb <= TDryBulb))
            throw new Error("Wet bulb temperature is above dry bulb temperature");

        Wsstar = this.GetSatHumRatio(TWetBulb, Pressure);

        if (this.isIP()) {
            if (TWetBulb >= FREEZING_POINT_WATER_IP)
                HumRatio = ((1093. - 0.556 * TWetBulb) * Wsstar - 0.240 * (TDryBulb - TWetBulb))
                    / (1093. + 0.444 * TDryBulb - TWetBulb);
            else
                HumRatio = ((1220. - 0.04 * TWetBulb) * Wsstar - 0.240 * (TDryBulb - TWetBulb))
                    / (1220. + 0.444 * TDryBulb - 0.48 * TWetBulb);
        } else {
            if (TWetBulb >= FREEZING_POINT_WATER_SI)
                HumRatio = ((2501. - 2.326 * TWetBulb) * Wsstar - 1.006 * (TDryBulb - TWetBulb))
                    / (2501. + 1.86 * TDryBulb - 4.186 * TWetBulb);
            else
                HumRatio = ((2830. - 0.24 * TWetBulb) * Wsstar - 1.006 * (TDryBulb - TWetBulb))
                    / (2830. + 1.86 * TDryBulb - 2.1 * TWetBulb);
        }
        // Validity check.
        return max(HumRatio, MIN_HUM_RATIO);
    }

    GetHumRatioFromRelHum// (o) Humidity Ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
    (TDryBulb                          // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , RelHum                            // (i) Relative humidity [0-1]
        , Pressure                          // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let VapPres;

        if (!(RelHum >= 0. && RelHum <= 1.))
            throw new Error("Relative humidity is outside range [0,1]");

        VapPres = this.GetVapPresFromRelHum(TDryBulb, RelHum);
        return this.GetHumRatioFromVapPres(VapPres, Pressure);
    }

    GetRelHumFromHumRatio// (o) Relative humidity [0-1]
    (TDryBulb                          // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , HumRatio                          // (i) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
        , Pressure                          // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let VapPres;

        if (!(HumRatio >= 0.))
            throw new Error("Humidity ratio is negative");

        VapPres = this.GetVapPresFromHumRatio(HumRatio, Pressure);
        return this.GetRelHumFromVapPres(TDryBulb, VapPres);
    }

    GetHumRatioFromTDewPoint // (o) Humidity Ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
    (TDewPoint                             // (i) Dew point temperature in °F [IP] or °C [SI]
        , Pressure                              // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let VapPres;

        VapPres = this.GetSatVapPres(TDewPoint);
        return this.GetHumRatioFromVapPres(VapPres, Pressure);
    }

    GetTDewPointFromHumRatio // (o) Dew Point temperature in °F [IP] or °C [SI]
    (TDryBulb                              // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , HumRatio                              // (i) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
        , Pressure                              // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let VapPres;

        if (!(HumRatio >= 0.))
            throw new Error("Humidity ratio is negative");

        VapPres = this.GetVapPresFromHumRatio(HumRatio, Pressure);
        return this.GetTDewPointFromVapPres(TDryBulb, VapPres);
    }

    /******************************************************************************************************
     * Conversions between humidity ratio and vapor pressure
     *****************************************************************************************************/

    GetHumRatioFromVapPres // (o) Humidity Ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
    (VapPres                             // (i) Partial pressure of water vapor in moist air in Psi [IP] or Pa [SI]
        , Pressure                            // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let HumRatio;

        if (!(VapPres >= 0.))
            throw new Error("Partial pressure of water vapor in moist air is negative");

        HumRatio = 0.621945 * VapPres / (Pressure - VapPres);

        // Validity check.
        return max(HumRatio, MIN_HUM_RATIO);
    }

    GetVapPresFromHumRatio // (o) Partial pressure of water vapor in moist air in Psi [IP] or Pa [SI]
    (HumRatio                            // (i) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
        , Pressure                            // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let VapPres, BoundedHumRatio;

        if (!(HumRatio >= 0.))
            throw new Error("Humidity ratio is negative");
        BoundedHumRatio = max(HumRatio, MIN_HUM_RATIO);

        VapPres = Pressure * BoundedHumRatio / (0.621945 + BoundedHumRatio);
        return VapPres;
    }

    /******************************************************************************************************
     * Conversions between humidity ratio and specific humidity
     *****************************************************************************************************/

    GetSpecificHumFromHumRatio // (o) Specific humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
    (HumRatio                                // (i) Humidity ratio in lb_H₂O lb_Dry_Air⁻¹ [IP] or kg_H₂O kg_Dry_Air⁻¹ [SI]
    ) {
        let BoundedHumRatio;
        if (!(HumRatio >= 0.))
            throw new Error("Humidity ratio is negative");
        BoundedHumRatio = max(HumRatio, MIN_HUM_RATIO);

        return BoundedHumRatio / (1.0 + BoundedHumRatio);
    }

    GetHumRatioFromSpecificHum // (o) Humidity ratio in lb_H₂O lb_Dry_Air⁻¹ [IP] or kg_H₂O kg_Dry_Air⁻¹ [SI]
    (SpecificHum                             // (i) Specific humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
    ) {
        let HumRatio;

        if (!(SpecificHum >= 0.0 && SpecificHum < 1.0))
            throw new Error("Specific humidity is outside range [0, 1)");

        HumRatio = SpecificHum / (1.0 - SpecificHum);

        // Validity check
        return max(HumRatio, MIN_HUM_RATIO);
    }

    /******************************************************************************************************
     * Dry Air Calculations
     *****************************************************************************************************/

    GetDryAirEnthalpy// (o) Dry air enthalpy in Btu lb⁻¹ [IP] or J kg⁻¹ [SI]
    (TDryBulb                      // (i) Dry bulb temperature in °F [IP] or °C [SI]
    ) {
        if (this.isIP())
            return 0.240 * TDryBulb;
        else
            return 1006. * TDryBulb;
    }

    GetDryAirDensity // (o) Dry air density in lb ft⁻³ [IP] or kg m⁻³ [SI]
    (TDryBulb                      // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , Pressure                      // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        if (this.isIP())
            return (144. * Pressure) / R_DA_IP / this.GetTRankineFromTFahrenheit(TDryBulb);
        else
            return Pressure / R_DA_SI / this.GetTKelvinFromTCelsius(TDryBulb);
    }

    GetDryAirVolume// (o) Dry air volume ft³ lb⁻¹ [IP] or in m³ kg⁻¹ [SI]
    (TDryBulb                    // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , Pressure                    // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        if (this.isIP())
            return R_DA_IP * this.GetTRankineFromTFahrenheit(TDryBulb) / (144. * Pressure);
        else
            return R_DA_SI * this.GetTKelvinFromTCelsius(TDryBulb) / Pressure;
    }

    GetTDryBulbFromEnthalpyAndHumRatio  // (o) Dry-bulb temperature in °F [IP] or °C [SI]
    (MoistAirEnthalpy                                 // (i) Moist air enthalpy in Btu lb⁻¹ [IP] or J kg⁻¹
        , HumRatio                                         // (i) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
    ) {
        let BoundedHumRatio;
        if (!(HumRatio >= 0.))
            throw new Error("Humidity ratio is negative");
        BoundedHumRatio = max(HumRatio, MIN_HUM_RATIO);

        if (this.isIP())
            return (MoistAirEnthalpy - 1061.0 * BoundedHumRatio) / (0.240 + 0.444 * BoundedHumRatio);
        else
            return (MoistAirEnthalpy / 1000.0 - 2501.0 * BoundedHumRatio) / (1.006 + 1.86 * BoundedHumRatio);
    }

    GetHumRatioFromEnthalpyAndTDryBulb  // (o) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻
    (MoistAirEnthalpy                                 // (i) Moist air enthalpy in Btu lb⁻¹ [IP] or J kg⁻¹
        , TDryBulb                                         // (i) Dry-bulb temperature in °F [IP] or °C [SI]
    ) {
        let HumRatio;
        if (this.isIP())
            HumRatio = (MoistAirEnthalpy - 0.240 * TDryBulb) / (1061.0 + 0.444 * TDryBulb);
        else
            HumRatio = (MoistAirEnthalpy / 1000.0 - 1.006 * TDryBulb) / (2501.0 + 1.86 * TDryBulb);

        // Validity check.
        return max(HumRatio, MIN_HUM_RATIO);
    }

    /******************************************************************************************************
     * Saturated Air Calculations
     *****************************************************************************************************/

    GetSatVapPres// (o) Vapor Pressure of saturated air in Psi [IP] or Pa [SI]
    (TDryBulb                  // (i) Dry bulb temperature in °F [IP] or °C [SI]
    ) {
        let LnPws, T;

        if (this.isIP()) {
            if (!(TDryBulb >= -148. && TDryBulb <= 392.))
                throw new Error("Dry bulb temperature is outside range [-148, 392]");

            T = this.GetTRankineFromTFahrenheit(TDryBulb);
            if (TDryBulb <= TRIPLE_POINT_WATER_IP)
                LnPws = (-1.0214165E+04 / T - 4.8932428 - 5.3765794E-03 * T + 1.9202377E-07 * T * T
                    + 3.5575832E-10 * pow(T, 3) - 9.0344688E-14 * pow(T, 4) + 4.1635019 * log(T));
            else
                LnPws = -1.0440397E+04 / T - 1.1294650E+01 - 2.7022355E-02 * T + 1.2890360E-05 * T * T
                    - 2.4780681E-09 * pow(T, 3) + 6.5459673 * log(T);
        } else {
            if (!(TDryBulb >= -100. && TDryBulb <= 200.))
                throw new Error("Dry bulb temperature is outside range [-100, 200]");

            T = this.GetTKelvinFromTCelsius(TDryBulb);
            if (TDryBulb <= TRIPLE_POINT_WATER_SI)
                LnPws = -5.6745359E+03 / T + 6.3925247 - 9.677843E-03 * T + 6.2215701E-07 * T * T
                    + 2.0747825E-09 * pow(T, 3) - 9.484024E-13 * pow(T, 4) + 4.1635019 * log(T);
            else
                LnPws = -5.8002206E+03 / T + 1.3914993 - 4.8640239E-02 * T + 4.1764768E-05 * T * T
                    - 1.4452093E-08 * pow(T, 3) + 6.5459673 * log(T);
        }

        return exp(LnPws);
    }

    GetSatHumRatio // (o) Humidity ratio of saturated air in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
    (TDryBulb                    // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , Pressure                    // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let SatVaporPres, SatHumRatio;

        SatVaporPres = this.GetSatVapPres(TDryBulb);
        SatHumRatio = 0.621945 * SatVaporPres / (Pressure - SatVaporPres);

        // Validity check.
        return max(SatHumRatio, MIN_HUM_RATIO);
    }

    // Return saturated air enthalpy given dry-bulb temperature and pressure.
    // Reference: ASHRAE Handbook - Fundamentals (2017) ch. 1
    GetSatAirEnthalpy// (o) Saturated air enthalpy in Btu lb⁻¹ [IP] or J kg⁻¹ [SI]
    (TDryBulb                      // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , Pressure                      // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        return this.GetMoistAirEnthalpy(TDryBulb, this.GetSatHumRatio(TDryBulb, Pressure));
    }

    /******************************************************************************************************
     * Moist Air Calculations
     *****************************************************************************************************/

    GetVaporPressureDeficit // (o) Vapor pressure deficit in Psi [IP] or Pa [SI]
    (TDryBulb            // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , HumRatio            // (i) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
        , Pressure            // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let RelHum;

        if (!(HumRatio >= 0.))
            throw new Error("Humidity ratio is negative");

        RelHum = this.GetRelHumFromHumRatio(TDryBulb, HumRatio, Pressure);
        return this.GetSatVapPres(TDryBulb) * (1. - RelHum);
    }

    GetDegreeOfSaturation// (o) Degree of saturation (unitless)
    (TDryBulb                          // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , HumRatio                          // (i) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
        , Pressure                          // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let BoundedHumRatio;

        if (!(HumRatio >= 0.))
            throw new Error("Humidity ratio is negative");
        BoundedHumRatio = max(HumRatio, MIN_HUM_RATIO);

        return BoundedHumRatio / this.GetSatHumRatio(TDryBulb, Pressure);
    }

    GetMoistAirEnthalpy// (o) Moist Air Enthalpy in Btu lb⁻¹ [IP] or J kg⁻¹ [SI]
    (TDryBulb                        // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , HumRatio                        // (i) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
    ) {
        let BoundedHumRatio;

        if (!(HumRatio >= 0.))
            throw new Error("Humidity ratio is negative");
        BoundedHumRatio = max(HumRatio, MIN_HUM_RATIO);

        if (this.isIP())
            return 0.240 * TDryBulb + BoundedHumRatio * (1061. + 0.444 * TDryBulb);
        else
            return (1.006 * TDryBulb + BoundedHumRatio * (2501. + 1.86 * TDryBulb)) * 1000.;
    }

    GetMoistAirVolume// (o) Specific Volume ft³ lb⁻¹ [IP] or in m³ kg⁻¹ [SI]
    (TDryBulb                      // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , HumRatio                      // (i) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
        , Pressure                      // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let BoundedHumRatio;

        if (!(HumRatio >= 0.))
            throw new Error("Humidity ratio is negative");
        BoundedHumRatio = max(HumRatio, MIN_HUM_RATIO);

        if (this.isIP())
            return R_DA_IP * this.GetTRankineFromTFahrenheit(TDryBulb) * (1. + 1.607858 * BoundedHumRatio) / (144. * Pressure);
        else
            return R_DA_SI * this.GetTKelvinFromTCelsius(TDryBulb) * (1. + 1.607858 * BoundedHumRatio) / Pressure;
    }

    GetTDryBulbFromMoistAirVolumeAndHumRatio // (o) Dry-bulb temperature in °F [IP] or °C [SI]
    (MoistAirVolume                                        // (i) Specific volume of moist air in ft³ lb⁻¹ of dry air [IP] or in m³ kg⁻¹ of dry air [SI]
        , HumRatio                                              // (i) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
        , Pressure                                              // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let BoundedHumRatio;

        if (!(HumRatio >= 0.))
            throw new Error("Humidity ratio is negative");
        BoundedHumRatio = max(HumRatio, MIN_HUM_RATIO);

        if (this.isIP())
            return this.GetTFahrenheitFromTRankine(MoistAirVolume * (144 * Pressure) / (R_DA_IP * (1 + 1.607858 * BoundedHumRatio)));
        else
            return this.GetTCelsiusFromTKelvin(MoistAirVolume * Pressure / (R_DA_SI * (1 + 1.607858 * BoundedHumRatio)));
    }

    GetMoistAirDensity // (o) Moist air density in lb ft⁻³ [IP] or kg m⁻³ [SI]
    (TDryBulb                        // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , HumRatio                        // (i) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
        , Pressure                        // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        let BoundedHumRatio;

        if (!(HumRatio >= 0.))
            throw new Error("Humidity ratio is negative");
        BoundedHumRatio = max(HumRatio, MIN_HUM_RATIO);

        return (1. + BoundedHumRatio) / this.GetMoistAirVolume(TDryBulb, BoundedHumRatio, Pressure);
    }


    /******************************************************************************************************
     * Standard atmosphere
     *****************************************************************************************************/

    GetStandardAtmPressure // (o) Standard atmosphere barometric pressure in Psi [IP] or Pa [SI]
    (Altitude                            // (i) Altitude in ft [IP] or m [SI]
    ) {
        let Pressure;

        if (this.isIP())
            Pressure = 14.696 * pow(1. - 6.8754e-06 * Altitude, 5.2559);
        else
            Pressure = 101325. * pow(1. - 2.25577e-05 * Altitude, 5.2559);
        return Pressure;
    }

    GetStandardAtmTemperature// (o) Standard atmosphere dry bulb temperature in °F [IP] or °C [SI]
    (Altitude                              // (i) Altitude in ft [IP] or m [SI]
    ) {
        let Temperature;
        if (this.isIP())
            Temperature = 59. - 0.00356620 * Altitude;
        else
            Temperature = 15. - 0.0065 * Altitude;
        return Temperature;
    }

    GetSeaLevelPressure// (o) Sea level barometric pressure in Psi [IP] or Pa [SI]
    (StnPressure                     // (i) Observed station pressure in Psi [IP] or Pa [SI]
        , Altitude                        // (i) Altitude above sea level in ft [IP] or m [SI]
        , TDryBulb                        // (i) Dry bulb temperature ft³ lb⁻¹ [IP] or in m³ kg⁻¹ [SI]
    ) {
        let TColumn, H;
        if (this.isIP()) {
            // Calculate average temperature in column of air, assuming a lapse rate
            // of 3.6 °F/1000ft
            TColumn = TDryBulb + 0.0036 * Altitude / 2.;

            // Determine the scale height
            H = 53.351 * this.GetTRankineFromTFahrenheit(TColumn);
        } else {
            // Calculate average temperature in column of air, assuming a lapse rate
            // of 6.5 °C/km
            TColumn = TDryBulb + 0.0065 * Altitude / 2.;

            // Determine the scale height
            H = 287.055 * this.GetTKelvinFromTCelsius(TColumn) / 9.807;
        }

        // Calculate the sea level pressure
        const SeaLevelPressure = StnPressure * exp(Altitude / H);
        return SeaLevelPressure;
    }

    GetStationPressure // (o) Station pressure in Psi [IP] or Pa [SI]
    (SeaLevelPressure                // (i) Sea level barometric pressure in Psi [IP] or Pa [SI]
        , Altitude                        // (i) Altitude above sea level in ft [IP] or m [SI]
        , TDryBulb                        // (i) Dry bulb temperature in °F [IP] or °C [SI]
    ) {
        return SeaLevelPressure / this.GetSeaLevelPressure(1., Altitude, TDryBulb);
    }


    /******************************************************************************************************
     * Functions to set all psychrometric values
     *****************************************************************************************************/

    CalcPsychrometricsFromTWetBulb
    /**
     * HumRatio            // (o) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
     * TDewPoint           // (o) Dew point temperature in °F [IP] or °C [SI]
     * RelHum              // (o) Relative humidity [0-1]
     * VapPres             // (o) Partial pressure of water vapor in moist air in Psi [IP] or Pa [SI]
     * MoistAirEnthalpy    // (o) Moist air enthalpy in Btu lb⁻¹ [IP] or J kg⁻¹ [SI]
     * MoistAirVolume      // (o) Specific volume ft³ lb⁻¹ [IP] or in m³ kg⁻¹ [SI]
     * DegreeOfSaturation  // (o) Degree of saturation [unitless]
     */
    (TDryBulb            // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , TWetBulb            // (i) Wet bulb temperature in °F [IP] or °C [SI]
        , Pressure            // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        const HumRatio = this.GetHumRatioFromTWetBulb(TDryBulb, TWetBulb, Pressure);
        const TDewPoint = this.GetTDewPointFromHumRatio(TDryBulb, HumRatio, Pressure);
        const RelHum = this.GetRelHumFromHumRatio(TDryBulb, HumRatio, Pressure);
        const VapPres = this.GetVapPresFromHumRatio(HumRatio, Pressure);
        const MoistAirEnthalpy = this.GetMoistAirEnthalpy(TDryBulb, HumRatio);
        const MoistAirVolume = this.GetMoistAirVolume(TDryBulb, HumRatio, Pressure);
        const DegreeOfSaturation = this.GetDegreeOfSaturation(TDryBulb, HumRatio, Pressure);
        return [HumRatio, TDewPoint, RelHum, VapPres, MoistAirEnthalpy, MoistAirVolume, DegreeOfSaturation];
    }

    CalcPsychrometricsFromTDewPoint
    /**
     * HumRatio            // (o) Humidity ratio in lb_H₂O lb_Air⁻¹ [IP] or kg_H₂O kg_Air⁻¹ [SI]
     * TWetBulb            // (o) Wet bulb temperature in °F [IP] or °C [SI]
     * RelHum              // (o) Relative humidity [0-1]
     * VapPres             // (o) Partial pressure of water vapor in moist air in Psi [IP] or Pa [SI]
     * MoistAirEnthalpy    // (o) Moist air enthalpy in Btu lb⁻¹ [IP] or J kg⁻¹ [SI]
     * MoistAirVolume      // (o) Specific volume ft³ lb⁻¹ [IP] or in m³ kg⁻¹ [SI]
     * DegreeOfSaturation  // (o) Degree of saturation [unitless]
     */
    (TDryBulb            // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , TDewPoint           // (i) Dew point temperature in °F [IP] or °C [SI]
        , Pressure            // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        const HumRatio = this.GetHumRatioFromTDewPoint(TDewPoint, Pressure);
        const TWetBulb = this.GetTWetBulbFromHumRatio(TDryBulb, HumRatio, Pressure);
        const RelHum = this.GetRelHumFromHumRatio(TDryBulb, HumRatio, Pressure);
        const VapPres = this.GetVapPresFromHumRatio(HumRatio, Pressure);
        const MoistAirEnthalpy = this.GetMoistAirEnthalpy(TDryBulb, HumRatio);
        const MoistAirVolume = this.GetMoistAirVolume(TDryBulb, HumRatio, Pressure);
        const DegreeOfSaturation = this.GetDegreeOfSaturation(TDryBulb, HumRatio, Pressure);
        return [HumRatio, TWetBulb, RelHum, VapPres, MoistAirEnthalpy, MoistAirVolume, DegreeOfSaturation];
    }

    CalcPsychrometricsFromRelHum
    /**
     * HumRatio            // (o) Partial pressure of water vapor in moist air in Psi [IP] or Pa [SI]
     * TWetBulb            // (o) Wet bulb temperature in °F [IP] or °C [SI]
     * TDewPoint           // (o) Dew point temperature in °F [IP] or °C [SI]
     * VapPres             // (o) Partial pressure of water vapor in moist air [Psi]
     * MoistAirEnthalpy    // (o) Moist air enthalpy in Btu lb⁻¹ [IP] or J kg⁻¹ [SI]
     * MoistAirVolume      // (o) Specific volume ft³ lb⁻¹ [IP] or in m³ kg⁻¹ [SI]
     * DegreeOfSaturation  // (o) Degree of saturation [unitless]
     */
    (TDryBulb            // (i) Dry bulb temperature in °F [IP] or °C [SI]
        , RelHum              // (i) Relative humidity [0-1]
        , Pressure            // (i) Atmospheric pressure in Psi [IP] or Pa [SI]
    ) {
        const HumRatio = this.GetHumRatioFromRelHum(TDryBulb, RelHum, Pressure);
        const TWetBulb = this.GetTWetBulbFromHumRatio(TDryBulb, HumRatio, Pressure);
        const TDewPoint = this.GetTDewPointFromHumRatio(TDryBulb, HumRatio, Pressure);
        const VapPres = this.GetVapPresFromHumRatio(HumRatio, Pressure);
        const MoistAirEnthalpy = this.GetMoistAirEnthalpy(TDryBulb, HumRatio);
        const MoistAirVolume = this.GetMoistAirVolume(TDryBulb, HumRatio, Pressure);
        const DegreeOfSaturation = this.GetDegreeOfSaturation(TDryBulb, HumRatio, Pressure);
        return [HumRatio, TWetBulb, TDewPoint, VapPres, MoistAirEnthalpy, MoistAirVolume, DegreeOfSaturation];
    }
}