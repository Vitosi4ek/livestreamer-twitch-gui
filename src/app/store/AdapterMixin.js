import {
	get,
	isNone,
	Evented,
	Mixin
} from "Ember";
import {
	AdapterError,
	InvalidError
} from "EmberData";


const reURL = /^[a-z]+:\/\/([\w\.]+)\/(.+)$/i;


/**
 * Adapter mixin for using static model names
 * instead of using type.modelName as name
 */
export default Mixin.create( Evented, {
	findRecord( store, type, id, snapshot ) {
		var url = this.buildURL( type, id, snapshot, "findRecord" );
		return this.ajax( url, "GET" );
	},

	findAll( store, type, sinceToken ) {
		var url   = this.buildURL( type, null, null, "findAll" );
		var query = sinceToken ? { since: sinceToken } : undefined;
		return this.ajax( url, "GET", { data: query } );
	},

	query( store, type, query ) {
		var url = this.buildURL( type, query, null, "query" );
		query = this.sortQueryParams ? this.sortQueryParams( query ) : query;
		return this.ajax( url, "GET", { data: query } );
	},

	createRecordMethod: "POST",
	createRecord( store, type, snapshot ) {
		var self   = this;
		var url    = self.buildURL( type, null, snapshot, "createRecord" );
		var method = get( self, "createRecordMethod" );
		var data   = self.createRecordData( store, type, snapshot );
		return self.ajax( url, method, data )
			.then(function( data ) {
				self.trigger( "createRecord", store, type, snapshot );
				return data;
			});
	},
	createRecordData( store, type, snapshot ) {
		var data = {};
		var serializer = store.serializerFor( type.modelName );
		serializer.serializeIntoHash( data, type, snapshot, { includeId: true } );
		return { data: data };
	},

	updateRecordMethod: "PUT",
	updateRecord( store, type, snapshot ) {
		var self   = this;
		var url    = self.buildURL( type, snapshot.id, snapshot, "updateRecord" );
		var method = get( self, "updateRecordMethod" );
		var data   = self.updateRecordData( store, type, snapshot );
		return self.ajax( url, method, data )
			.then(function( data ) {
				self.trigger( "updateRecord", store, type, snapshot );
				return data;
			});
	},
	updateRecordData( store, type, snapshot ) {
		var data = {};
		var serializer = store.serializerFor( type.modelName );
		serializer.serializeIntoHash( data, type, snapshot );
		return { data: data };
	},

	deleteRecord( store, type, snapshot ) {
		var self = this;
		var url  = self.buildURL( type, snapshot.id, snapshot, "deleteRecord" );
		return self.ajax( url, "DELETE" )
			.then(function( data ) {
				self.trigger( "deleteRecord", store, type, snapshot );
				return data;
			});
	},


	urlForCreateRecord( modelName, snapshot ) {
		// Why does Ember-Data do this?
		// the id is missing on BuildURLMixin.urlForCreateRecord
		return this._buildURL( modelName, snapshot.id );
	},

	/**
	 * Custom buildURL method with type instead of modelName
	 * @param {DS.Model} type
	 * @param {string?} id
	 * @returns {string}
	 */
	_buildURL( type, id ) {
		var host = get( this, "host" );
		var ns   = get( this, "namespace" );
		var url  = [ host ];

		// append the adapter specific namespace
		if ( ns ) { url.push( ns ); }
		// append the type fragments (and process the dynamic ones)
		url.push( ...this.buildURLFragments( type, id ) );

		return url.join( "/" );
	},

	/**
	 * Custom method for building URL fragments
	 * @param {DS.Model} type
	 * @param {string?} id
	 * @returns {string[]}
	 */
	buildURLFragments( type, id ) {
		var path = type.toString();
		var url  = path.split( "/" );
		if ( !isNone( id ) ) { url.push( id ); }
		return url;
	},


	ajax( url ) {
		var adapter = this;
		return this._super( ...arguments )
			.catch(function( err ) {
				if ( err instanceof AdapterError ) {
					var _url = reURL.exec( url );
					err.host = _url && _url[1] || get( adapter, "host" );
					err.path = _url && _url[2] || get( adapter, "namespace" );
				}
				return Promise.reject( err );
			});
	},

	ajaxOptions() {
		var hash = this._super( ...arguments );
		hash.timeout = 10000;
		hash.cache = false;

		return hash;
	},

	isSuccess( status, headers, payload ) {
		return this._super( ...arguments )
		    && ( payload ? !payload.error : true );
	},

	handleResponse( status, headers, payload ) {
		if ( this.isSuccess( status, headers, payload ) ) {
			return payload;
		} else if ( this.isInvalid( status, headers, payload ) ) {
			return new InvalidError( payload && payload.errors || [] );
		}

		return new AdapterError([{
			name   : "HTTP Error",
			message: payload && payload.error || "Failed to load resource",
			detail : payload && payload.message,
			status
		}]);
	}

});
