import React, { Component } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  View,
  Button,
  PushNotificationIOS
} from 'react-native';
import MapView from 'react-native-maps';
import Tts from 'react-native-tts';
import BackgroundGeolocation from 'react-native-background-geolocation';

// In order to avoid error relate to not finding module react-transform-hmr
// rm -rf $TMPDIR/react-*; rm -rf $TMPDIR/haste-*; rm -rf $TMPDIR/metro-*; watchman watch-del-all
// react-native start  --reset-cache

// every X meters, when the app is still in the background, poll POI's and check if the nearest POI is closer
// than distance_treshold. If so, read description out loud

// Todo: move SPARQL query code to React Native app istead of server
// Todo: send out notification when new POI has been detected
// Todo

export default class RealReality extends Component {

  constructor(props){
    super(props);
    this.state = {
      notifiedPOIs: [],
      latitude: null,
      longitude: null,
      error: null,
      notifiedPOIs: [],
      activePOI: {
        title: null,
        abstract: null,
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      },
      region: {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }
    };
  }

  getLocationAndPois() {
    this.getGeoLocationPromise().then(
      result => {
        console.log("Geolocation promise returned");
        console.log(coords);
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

  getGeoLocationPromise() {
    return new Promise(
      function(resolve, reject) {
        console.log("getGeoLocationPromise");
        let currentLocation = BackgroundGeolocation.getCurrentPosition({
         timeout: 30,          // 30 second timeout to fetch location
         maximumAge: 5000,     // Accept the last-known-location if not older than 5000 ms.
         desiredAccuracy: 10,  // Try to fetch a location with an accuracy of `10` meters.
         samples: 3,           // How many location samples to attempt.
         }).then((response) => console.log(response.coords.latitude))
         .catch((error) =>{
           console.error(error);
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
    console.log("getPOIs");
    url = 'https://realreality.be/json/'+this.state.latitude+'/'+this.state.longitude;
    console.log(url);
    fetch(url)
     .then((response) => response.json())
     .then((responseJson) => {
       this.setState({
         poi: responseJson.pois[0]['abstract']['value'],
         activePOI: {
           title: responseJson.pois[0]['label']['value'],
           abstract: responseJson.pois[0]['abstract']['value'],
           latitude: parseFloat(responseJson.pois[0]['lat']['value']),
           longitude: parseFloat(responseJson.pois[0]['long']['value']),
         }
       }, function(){
         console.log("POI's read");
         console.log("activePOI");
         console.log(this.state.activePOI);
         console.log(this.state.latitude);
         console.log(this.state.longitude);
         console.log(responseJson.pois);
         if (this.state.notifiedPOIs.indexOf(this.state.activePOI.title) == -1) {
           PushNotificationIOS.presentLocalNotification({alertBody:"Available location: "+this.state.activePOI.title});
           this.state.notifiedPOIs.push(this.state.activePOI.title);
         }
         else console.log ("User was already notified of POI: "+ this.state.activePOI.title);
       });
     })
     .catch((error) =>{
       console.error(error);
     });
  }

  playTTS () {
    Tts.speak(this.state.activePOI.abstract);
  }

  stopTTS () {
    Tts.stop();
  }

  componentDidMount(){
    //this.getLocationAndPois(); //legacy Location and POI polling
    PushNotificationIOS.requestPermissions();
    BackgroundGeolocation.onLocation(this.onLocation.bind(this), this.onError);   // This handler fires whenever BackgroundGeolocation receives a location update.
    //BackgroundGeolocation.onMotionChange(this.onMotionChange);
    BackgroundGeolocation.setConfig({
        debug:false,
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
         let currentLocation = BackgroundGeolocation.getCurrentPosition({
          timeout: 30,          // 30 second timeout to fetch location
          maximumAge: 5000,     // Accept the last-known-location if not older than 5000 ms.
          desiredAccuracy: 10,  // Try to fetch a location with an accuracy of `10` meters.
          samples: 3,           // How many location samples to attempt.
        }).then((response) => console.log(response.coords.latitude))
        .catch((error) =>{
          console.error(error);
        });
        if (!state.enabled) {
          BackgroundGeolocation.start(function() {
            console.log("- Start success");
          });
        }
      });
  }

  componentWillUnmount() {
    BackgroundGeolocation.removeListeners();
    this.setState({
      notifiedPOIs : []
    });
  }

  onLocation(location) {
    console.log('[location] -', location);
    this.setState({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      region: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          },
      error: null,
    });
    this.getPOIs();
  }

  onMotionChange(event) {
   console.log('[motionchange] -', event.isMoving, event.location);
 }

  render(){
    return(
      <View style={styles.textContainer}>
       <KeyboardAvoidingView style={styles.textContainer} behavior="padding">
               <Text style={styles.title}>RealRealityApp</Text>
               <Text style={styles.text}>Your Latitude: {this.state.latitude}</Text>
               <Text style={styles.text}>Your Longitude: {this.state.longitude}</Text>
               <Text style={styles.text}>Closest POI: {this.state.activePOI.title}</Text>
               {this.state.error ? <Text>Error: {this.state.error}</Text> : null}
               <TouchableOpacity
                 style={styles.button}
                 onPress={this.getLocationAndPois.bind(this)}
                 underlayColor='#fff'>
                 <Text style={styles.buttonText}>Load closest POI</Text>
               </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  onPress={this.playTTS.bind(this)}
                  underlayColor='#fff'>
                  <Text style={styles.buttonText}>Read closest POI</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  onPress={this.stopTTS.bind(this)}
                  underlayColor='#fff'>
                  <Text style={styles.buttonText}>Stop reading</Text>
                </TouchableOpacity>
         </KeyboardAvoidingView>
         <MapView
           style={styles.map}
           region={this.state.region}
         >
         <MapView.Marker
          //style={styles.POIMarker}
          coordinate={ this.state.activePOI }
          title = { this.state.activePOI.title }
          pinColor='#000000'
        />
        <MapView.Marker
         coordinate={ this.state.region }
         title = { "Your Location" }
         pinColor='blue'
       />
         </MapView>
         </View>

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
  textContainer: {
    backgroundColor: '#000000',
    flex: 1,
    paddingTop: 10,
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
  },
  map: {
    flex: 1.5,
    paddingTop: 10,
 },
});
