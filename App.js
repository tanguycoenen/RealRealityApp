import React, { Component } from 'react';
import {
  StyleSheet,
  TextInput,
  ScrollView,
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
import Icon from 'react-native-vector-icons/FontAwesome';

const iconSize=40;
console.disableYellowBox = true;
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
      allPOIs: [],
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
         allPOIs: responseJson.pois,
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
         console.log(this.state.allPOIs);
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
    console.log("selected play");
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

  selectedMarker(event){
    console.log(event);
    this.setState({
      region: {
        latitude: event.nativeEvent.coordinate.latitude,
        longitude: event.nativeEvent.coordinate.longitude
      },
      activePOI: {
        title: event.title,
        abstract: event.abstract,
        latitude: event.nativeEvent.coordinate.latitude,
        longitude: event.nativeEvent.coordinate.longitude,
      }
    })
  }

  render(){
    return(
       <View style={styles.container}>
         <View style={styles.poiInfoSection} key={'poiInfoSection'}>
           <Text style={styles.poiTitle}>{this.state.activePOI.title}</Text>
           <Text style={styles.poiText}>{this.state.activePOI.abstract}</Text>
         </View>
         <MapView
           style={styles.map}
           region={this.state.region}
         >
         {this.state.allPOIs.map(poi => (
          <MapView.Marker
            key={poi['label']['value']+poi['lat']['value']}
            coordinate={{
                          latitude:parseFloat(poi['lat']['value']),
                          longitude:parseFloat(poi['long']['value'])
                      }}
            title={poi['label']['value']}
            description={poi['abstract']['value']}
            onPress={(e) => {
              e.title=poi['label']['value'];
              e.abstract = poi['abstract']['value'];
              this.selectedMarker(e);
              }
            }
            style={styles.callout}
          />
         ))}
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
         <View style={styles.actionButtonSection}>
           <TouchableOpacity
             style={styles.button}
             onPress={this.getLocationAndPois.bind(this)}
             underlayColor='#fff'>
             <Icon style={styles.buttonIcon} name="retweet" size={iconSize} />
           </TouchableOpacity>
           <TouchableOpacity
             style={styles.button}
             onPress={this.playTTS.bind(this)}
             underlayColor='#fff'>
             <Icon style={styles.buttonIcon} name="play" size={iconSize} />
           </TouchableOpacity>
           <TouchableOpacity
             style={styles.button}
             onPress={this.stopTTS.bind(this)}
             underlayColor='#fff'>
             <Icon style={styles.buttonIcon} name="stop" size={iconSize} />
           </TouchableOpacity>
         </View>
       </View>
    );
  }
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 9.25,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch'
  },
  actionButtonSection: {
    height:50,
    paddingBottom:15,
    justifyContent: 'space-around',
    alignItems: 'center',
    flexDirection: 'row',
  },
  button: {

  },
  buttonIcon:{
    color:'#46A9FC'
  },
  spacerSection: {
    flex:7
  },
  callout: {
    height:500
  },
  poiInfoSection: {
    backgroundColor:'white',
    marginTop:10,
    paddingTop:10,
    paddingBottom:5,
    paddingLeft:10,
    paddingRight:10,
    borderRadius:10,
    borderColor:'black',
    borderWidth:0,
    flex:2,
    width:"100%",

  },
  poiTitle: {
    color:'black',
    flex:0.2,
    fontWeight: 'bold',
    marginTop:15,
    position: 'relative',
  },
  poiText: {
    color:'black',
    flex:0.8,
    marginTop:2,
    position: 'relative',
  }
});
