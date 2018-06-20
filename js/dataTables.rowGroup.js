/*! RowGroup 1.0.3
 * ©2017-2018 SpryMedia Ltd - datatables.net/license
 */

/**
 * @summary     RowGroup
 * @description RowGrouping for DataTables
 * @version     1.0.3
 * @file        dataTables.rowGroup.js
 * @author      SpryMedia Ltd (www.sprymedia.co.uk)
 * @contact     datatables.net
 * @copyright   Copyright 2017-2018 SpryMedia Ltd.
 *
 * This source file is free software, available under the following license:
 *   MIT license - http://datatables.net/license/mit
 *
 * This source file is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE. See the license files for details.
 *
 * For details please refer to: http://www.datatables.net
 */

(function( factory ){
	if ( typeof define === 'function' && define.amd ) {
		// AMD
		define( ['jquery', 'datatables.net'], function ( $ ) {
			return factory( $, window, document );
		} );
	}
	else if ( typeof exports === 'object' ) {
		// CommonJS
		module.exports = function (root, $) {
			if ( ! root ) {
				root = window;
			}

			if ( ! $ || ! $.fn.dataTable ) {
				$ = require('datatables.net')(root, $).$;
			}

			return factory( $, root, root.document );
		};
	}
	else {
		// Browser
		factory( jQuery, window, document );
	}
}(function( $, window, document, undefined ) {
'use strict';
var DataTable = $.fn.dataTable;


var RowGroup = function ( dt, opts ) {
	// Sanity check that we are using DataTables 1.10 or newer
	if ( ! DataTable.versionCheck || ! DataTable.versionCheck( '1.10.8' ) ) {
		throw 'RowGroup requires DataTables 1.10.8 or newer';
	}

	// User and defaults configuration object
	this.c = $.extend( true, {},
		DataTable.defaults.rowGroup,
		RowGroup.defaults,
		opts
	);

	// Internal settings
	this.s = {
		dt: new DataTable.Api( dt ),

		dataFn: []
	};

	for (var i = 0; i < this.c.dataSrc.length; i++) {
		this.s.dataFn.push(DataTable.ext.oApi._fnGetObjectDataFn( this.c.dataSrc[i] ))
	}
	

	// DOM items
	this.dom = {

	};

	// Check if row grouping has already been initialised on this table
	var settings = this.s.dt.settings()[0];
	var existing = settings.rowGroup;
	if ( existing ) {
		return existing;
	}

	settings.rowGroup = this;
	this._constructor();
};


$.extend( RowGroup.prototype, {
	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
	 * API methods for DataTables API interface
	 */

	/**
	 * Get/set the grouping data source - need to call draw after this is
	 * executed as a setter
	 * @returns string~RowGroup
	 */
	dataSrc: function ( val )
	{
		if ( val === undefined ) {
			return this.c.dataSrc;
		}

		var dt = this.s.dt;

		this.c.dataSrc = val;
		this.s.dataFn = DataTable.ext.oApi._fnGetObjectDataFn( this.c.dataSrc );

		$(dt.table().node()).triggerHandler( 'rowgroup-datasrc.dt', [ dt, val ] );

		return this;
	},

	/**
	 * Disable - need to call draw after this is executed
	 * @returns RowGroup
	 */
	disable: function ()
	{
		this.c.enable = false;
		return this;
	},

	/**
	 * Enable - need to call draw after this is executed
	 * @returns RowGroup
	 */
	enable: function ( flag )
	{
		if ( flag === false ) {
			return this.disable();
		}

		this.c.enable = true;
		return this;
	},


	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
	 * Constructor
	 */
	_constructor: function ()
	{
		var that = this;
		var dt = this.s.dt;
		var rows = dt.rows();
		var groups = [];

		rows.every( function () {
			var d = this.data();
			var group = that.s.dataFn( d );
			
			if ( groups.indexOf(group) == -1 ) {
				groups.push( group );
			}
		} );

		dt.on( 'draw.dtrg', function () {
			if ( that.c.enable ) {
				that._draw();
			}
		} );

		dt.on( 'column-visibility.dt.dtrg responsive-resize.dt.dtrg', function () {
			that._adjustColspan();
		} );

		dt.on( 'destroy', function () {
			dt.off( '.dtrg' );
		} );

		dt.on('responsive-resize.dt', function () {
			that._adjustColspan();
		})
	},


	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
	 * Private methods
	 */

	/**
	 * Adjust column span when column visibility changes
	 * @private
	 */
	_adjustColspan: function ()
	{
		$( 'tr.'+this.c.className, this.s.dt.table().body() ).find('td')
			.attr( 'colspan', this._colspan() );
	},

	/**
	 * Get the number of columns that a grouping row should span
	 * @private
	 */
	_colspan: function ()
	{
		return this.s.dt.columns().visible().reduce( function (a, b) {
			return a + b;
		}, 0 );
	},

	/**
	 * Update function that is called whenever we need to draw the grouping rows
	 * @private
	 */
	_draw: function ()
	{
		var dataFn = this.s.dataFn
		for(var j = 0; j < dataFn.length; j++)
		{
			var dt = this.s.dt;
			var rows = dt.rows( { page: 'current' } );
			var groupedRows = [];
			var last, lastGroupBefore, display;

			rows.every( function () {
				var d = this.data();
				var group = dataFn[j]( d );
				var groupBefore = j > 0 ? dataFn[j - 1]( d ) : undefined;

				if ( last === undefined || group !== last ||
						 (groupBefore !== undefined && lastGroupBefore === undefined) ||
						 (groupBefore !== undefined && groupBefore !== lastGroupBefore) ) {
					groupedRows.push( [] );
					last = group;
					groupBefore !== undefined ? lastGroupBefore = groupBefore : lastGroupBefore = undefined
				}
				
				groupedRows[ groupedRows.length - 1 ].push( this.index() );
			} );

			for ( var i=0, ien=groupedRows.length ; i<ien ; i++ ) {
				var group = groupedRows[i];
				var firstRow = dt.row(group[0]);
				var groupName = dataFn[j]( firstRow.data() );
				
				var gpm = this.s.dt.columns().header()[this.c.dataSrc[j]].innerText.capitalize()

				groupName = gpm ? gpm + ': ' + groupName : groupName

				var gpNM = j === 0 ? this.c.startClassName + '-' + j : 'subgroup-' + j
				
				if ( this.c.startRender ) {
					display = this.c.startRender.call( this, dt.rows(group), groupName );

					this
						._rowWrap( display, gpNM, group, j )
						.insertBefore( firstRow.node() );
				}

				if ( this.c.endRender ) {
					display = this.c.endRender.call( this, dt.rows(group), groupName );
					
					this
						._rowWrap( display, this.c.endClassName, group, j )
						.insertAfter( dt.row( group[ group.length-1 ] ).node() );
				}
			}
		}
	},

	/**
	 * Take a rendered value from an end user and make it suitable for display
	 * as a row, by wrapping it in a row, or detecting that it is a row.
	 * @param [node|jQuery|string] display Display value
	 * @param [string] className Class to add to the row
	 * @param [array] group
	 * @param [number] group level
	 * @private
	 */
	_rowWrap: function ( display, className, group, level )
	{
		var row;
		
		if ( display === null || display === undefined || display === '' ) {
			display = this.c.emptyDataGroup;
		}

		if ( display === null ) {
			return null;
		}
		
		if ( typeof display === 'object' && display.nodeName && display.nodeName.toLowerCase() === 'tr') {
			row = $(display);
		}
		else if (display instanceof $ && display.length && display[0].nodeName.toLowerCase() === 'tr') {
			row = display;
		}
		else {
			row = $('<tr/>')
				.append(
					$('<td/>')
						.attr( 'colspan', this._colspan() )
						.append( display  )
				);
		}

		var dt = this.s.dt

		row.addClass( this.c.className )
		   .addClass( className )
		   .css('cursor', 'pointer')

		$(row).on('click', function() {
			var currentRow = $(this).next()
			var hide = true
			
			if($(this).data('colapsed')) {
				$(this).data('colapsed', false)
				hide = false
			}
			else {
				$(this).data('colapsed', true)
				hide = true
			}

			// Verifica se é um grupo root
			var isRootGroup = $(this).attr("class").split(' ').map((item) => { return item.indexOf('group-start-') !== -1 }).indexOf(true) !== -1;
			if(isRootGroup) {
				// Percorre todas as linhas até encontrar o proximo grupo root
				while ($(currentRow).attr("class") && !($(currentRow).attr("class").split(' ').map((item) => { return item.indexOf('group-start-') !== -1 }).indexOf(true) !== -1)) {
					hide ? $(currentRow).hide(400) : $(currentRow).show(400)
					currentRow = $(currentRow).next()
				}			
			}
			else { // Se for um subgrupo
				// Percorre ate encontrar o proximo subgrupo
				while ($(currentRow).attr("class") && !($(currentRow).attr("class").split(' ').map((item) => { return item.indexOf('subgroup') !== -1 }).indexOf(true) !== -1) &&
					   !($(currentRow).attr("class").split(' ').map((item) => { return item.indexOf('group-start-') !== -1 }).indexOf(true) !== -1)) {

					hide ? $(currentRow).hide(400) : $(currentRow).show(400)
					currentRow = $(currentRow).next()
				}			
			}
		})

		return row;
	}
} );


/**
 * RowGroup default settings for initialisation
 *
 * @namespace
 * @name RowGroup.defaults
 * @static
 */
RowGroup.defaults = {
	/**
	 * Class to apply to grouping rows - applied to both the start and
	 * end grouping rows.
	 * @type string
	 */
	className: 'group',

	/**
	 * Data property from which to read the grouping information
	 * @type string|integer
	 */
	dataSrc: 0,

	/**
	 * Text to show if no data is found for a group
	 * @type string
	 */
	emptyDataGroup: 'No group',

	/**
	 * Initial enablement state
	 * @boolean
	 */
	enable: true,

	/**
	 * Class name to give to the end grouping row
	 * @type string
	 */
	endClassName: 'group-end',

	/**
	 * End grouping label function
	 * @function
	 */
	endRender: null,

	/**
	 * Class name to give to the start grouping row
	 * @type string
	 */
	startClassName: 'group-start',

	/**
	 * Start grouping label function
	 * @function
	 */
	startRender: function ( rows, group ) {
		return group;
	}
};


RowGroup.version = "1.0.3";


$.fn.dataTable.RowGroup = RowGroup;
$.fn.DataTable.RowGroup = RowGroup;


DataTable.Api.register( 'rowGroup()', function () {
	return this;
} );

DataTable.Api.register( 'rowGroup().disable()', function () {
	return this.iterator( 'table', function (ctx) {
		if ( ctx.rowGroup ) {
			ctx.rowGroup.enable( false );
		}
	} );
} );

DataTable.Api.register( 'rowGroup().enable()', function ( opts ) {
	return this.iterator( 'table', function (ctx) {
		if ( ctx.rowGroup ) {
			ctx.rowGroup.enable( opts === undefined ? true : opts );
		}
	} );
} );

DataTable.Api.register( 'rowGroup().dataSrc()', function ( val ) {
	if ( val === undefined ) {
		return this.context[0].rowGroup.dataSrc();
	}

	return this.iterator( 'table', function (ctx) {
		if ( ctx.rowGroup ) {
			ctx.rowGroup.dataSrc( val );
		}
	} );
} );


// Attach a listener to the document which listens for DataTables initialisation
// events so we can automatically initialise
$(document).on( 'preInit.dt.dtrg', function (e, settings, json) {
	if ( e.namespace !== 'dt' ) {
		return;
	}

	var init = settings.oInit.rowGroup;
	var defaults = DataTable.defaults.rowGroup;

	if ( init || defaults ) {
		var opts = $.extend( {}, defaults, init );

		if ( init !== false ) {
			new RowGroup( settings, opts  );
		}
	}
} );


return RowGroup;

}));
