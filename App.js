import React, { Component } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  View,
  Button
} from 'react-native';
import Tts from 'react-native-tts';
import BackgroundGeolocation from 'react-native-background-geolocation';

// In order to avoid error relate to not finding module react-transform-hmr
// rm -rf $TMPDIR/react-*; rm -rf $TMPDIR/haste-*; rm -rf $TMPDIR/metro-*; watchman watch-del-all
// react-native start  --reset-cache

// every minute, when the app is still in the background, poll POI's and check if the nearest POI is closer
// than distance_treshold. If so, read description out loud

export default class RealReality extends Component {

  constructor(props){
    super(props);
    this.state = {
      dataSource: null,
      isLoading: true,
      latitude: null,
      longitude: null,
      error: null,
      poi: null,
    };
  }

  getGeoLocationPromise() {
    return new Promise(function(resolve, reject) {
      console.log("getGeoLocationPromise");
      navigator.geolocation.getCurrentPosition(
        (position) => {
            coords = [position.coords.latitude,position.coords.longitude];
            resolve(coords);
          });
        },
        (error) => {
          this.setState({ error: error.message });
          reject(error.message);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
      )
  }

  getPOIs() {
    url = 'https://realreality.be/json/'+this.state.latitude+'/'+this.state.longitude;
    console.log(url);
    fetch(url)
     .then((response) => response.json())
     .then((responseJson) => {
       this.setState({
         dataSource: responseJson
       }, function(){
         console.log("POI's read");
         console.log(this.state.latitude);
         console.log(this.state.longitude);
         console.log(responseJson.pois);
         //Speak selected text using native TTS library
         Tts.speak(responseJson.pois[0]['abstract']['value']);
       });
     })
     .catch((error) =>{
       console.error(error);
     });
  }

  getLocationAndPois() {
    this.getGeoLocationPromise().then(
      result => {
        this.setState({
          latitude: coords[0],
          longitude: coords[1],
          error: null,
        });
        this.getPOIs();
      },
      error => {
        this.setState({
          error: error,
        });
        console.log(error)
      }
    )
  }

  componentDidMount(){
    //this.getLocationAndPois();

    // This handler fires whenever bgGeo receives a location update.
    BackgroundGeolocation.onLocation(this.onLocation.bind(this), this.onError);
    BackgroundGeolocation.onMotionChange(this.onMotionChange);
    BackgroundGeolocation.setConfig({
        debug:true,
        logLevel: BackgroundGeolocation.LOG_LEVEL_ERROR,
        desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
        distanceFilter: 400,
        activityRecognitionInterval:10000,
        stopTimeout: 1,
        stopOnTerminate: true,   // <-- Allow the background-service to continue tracking when user closes the app.
        startOnBoot: false,        // <-- Auto start tracking when device is powered-up.
    });
    BackgroundGeolocation.ready({
      }, (state) => {
        console.log("- BackgroundGeolocation is configured and ready: ", state.enabled);
        if (!state.enabled) {
          BackgroundGeolocation.start(function() {
            console.log("- Start success");
          });
        }
      });
  }

  componentWillUnmount() {
    BackgroundGeolocation.removeListeners();
  }

  onLocation(location) {
    console.log('[location] -', location);
    this.setState({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      error: null,
    });
    this.getPOIs();
  }

  onMotionChange(event) {
   console.log('[motionchange] -', event.isMoving, event.location);
 }

  render(){

    return(
       <KeyboardAvoidingView style={styles.container} behavior="padding">
               <Text style={styles.title}>RealRealityApp_v0.2</Text>
               <Text style={styles.text}>Latitude: {this.state.latitude}</Text>
               <Text style={styles.text}>Longitude: {this.state.longitude}</Text>
               {this.state.error ? <Text>Error: {this.state.error}</Text> : null}
                <TouchableOpacity
                  style={styles.button}
                  onPress={this.getLocationAndPois.bind(this)}
                  underlayColor='#fff'>
                  <Text style={styles.buttonText}>Read me the closest POI</Text>
                </TouchableOpacity>
         </KeyboardAvoidingView>

    );
  }
}
const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 24,
    color: '#ffffff',
  },
  text: {
    paddingBottom: 2,
    padding: 8,
    color: '#ffffff',
  },
  container: {
    backgroundColor: '#000000',
    flex: 1,
    paddingTop: 40,
  },
  input: {
    height: 40,
    borderWidth: 1,
    margin: 8,
    padding: 8,
    width: '95%',
  },
  button:{
    marginRight:40,
    marginLeft:40,
    marginTop:10,
    paddingTop:10,
    paddingBottom:10,
    backgroundColor:'#139622',
    borderRadius:10,
    borderWidth: 0,
    borderColor: '#fff'
  },
  buttonText:{
      color:'#fff',
      textAlign:'center',
      paddingLeft : 10,
      paddingRight : 10
  }
});
