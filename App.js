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
import KeepAwake from 'react-native-keep-awake';


const iconSize=40;
console.disableYellowBox = true;
const INITIAL_LATITUDE= 37.78825;
const INITIAL_LONGITUDE= -122.4324;
// In order to avoid error relate to not finding module react-transform-hmr
// rm -rf $TMPDIR/react-*; rm -rf $TMPDIR/haste-*; rm -rf $TMPDIR/metro-*; watchman watch-del-all
// react-native start  --reset-cache

// every X meters, when the app is still in the background, poll POI's and check if the nearest POI is closer
// than distance_treshold. If so, read description out loud

// Todo: move SPARQL query code to React Native app istead of server
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
        latitude: INITIAL_LATITUDE,
        longitude: INITIAL_LONGITUDE,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      },
      region: {
        latitude: INITIAL_LATITUDE,
        longitude: INITIAL_LONGITUDE,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      },
      userLocation: null,
      infoPOITitle:null,
      infoPOIAbstract:null,
      infoPOIDistance:null
    };
    this.initiateLocation();
    //this.getLocationAndPois();
  }

  initiateLocation() {
    BackgroundGeolocation.onLocation(this.onLocation.bind(this), this.onError);   // This handler fires whenever BackgroundGeolocation receives a location update.
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
         //make the closest POI the active one
         activePOI: {
           title: responseJson.pois[0]['label']['value'],
           abstract: responseJson.pois[0]['abstract']['value'],
           latitude: parseFloat(responseJson.pois[0]['lat']['value']),
           longitude: parseFloat(responseJson.pois[0]['long']['value']),
         },
         infoPOITitle: responseJson.pois[0]['label']['value'],
         infoPOIAbstract: responseJson.pois[0]['abstract']['value'],
         infoPOIDistance: responseJson.pois[0]['distance']['value']
       }, function(){
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
        latitudeDelta: this.state.region.latitudeDelta,
        longitudeDelta: this.state.region.longitudeDelta,
      },
      userLocation: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      error: null,
    });
    this.getPOIs();
  }

  onMotionChange(event) {
   //console.log('[motionchange] -', event.isMoving, event.location);
  }

  selectedMarker(event){
    this.setState({
      infoPOITitle: event.title,
      infoPOIAbstract: event.abstract,
      infoPOIDistance: event.distance,
      activePOI: {
        title: event.title,
        abstract: event.abstract,
        latitude: event.nativeEvent.coordinate.latitude,
        longitude: event.nativeEvent.coordinate.longitude,
      },
    })
  }

  setRegionDeltaAfterZoom(region){
    //Makse sure that that the region state is updated to match the zoom level in the app at any time
    //This must be set, or the region will reset to the original constructor value every time a marker is clicked
    this.state.region= {
        longitude:region.longitude,
        latitude:region.latitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta
      };
  }

  render(){
    //if (this.props.screenShouldBeAwake) {
    //if (true) {
        return(
         <View style={styles.container} key={this.state.infoPOITitle}>
           <ScrollView style={styles.poiInfoSection} >
             <Text style={styles.poiTitle}>{this.state.infoPOITitle}</Text>
             <Text style={styles.poiDistance}>{this.state.infoPOIDistance} Loading...</Text>
             <Text style={styles.poiText}>{this.state.infoPOIAbstract}</Text>
           </ScrollView>
           <MapView
             style={styles.map}
             region={this.state.region}
             onRegionChangeComplete={
               region => {
                 this.setRegionDeltaAfterZoom(region);
               }
             }
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
                  e.persist();
                  e.title=poi['label']['value'];
                  e.abstract = poi['abstract']['value'];
                  e.distance = poi['distance']['value'];
                  this.selectedMarker(e);
                  }
                }
                style={styles.callout}
                pinColor={(poi['label']['value']==this.state.activePOI.title)?"#000000":"#46a9fc"}
              >
                <MapView.Callout tooltip={true}/>
              </MapView.Marker>
             ))}
             {this.state.userLocation!=null ?
                 <MapView.Marker
                  coordinate={ this.state.userLocation }
                  title = { "Your Location" }
                  pinColor='blue'
                 />:null
             }
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
           <KeepAwake />
         </View>
       )
      //}
  }
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 8,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch'
  },
  actionButtonSection: {
    flex:1,
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
  callout: {
  },
  poiInfoSection: {
    backgroundColor:'white',
    marginTop:10,
    paddingTop:30,
    paddingBottom:5,
    paddingLeft:10,
    paddingRight:10,
    borderRadius:10,
    borderColor:'black',
    borderWidth:0,
    height:200,
    //flex:1,
    width:"100%",

  },
  poiTitle: {
    color:'black',
    flex:0.2,
    fontWeight: 'bold',
    fontSize: 15,
    marginTop:20,
    position: 'relative',
  },
  poiText: {
    color:'black',
    flex:0.8,
    marginTop:2,
    position: 'relative',
  }
});
