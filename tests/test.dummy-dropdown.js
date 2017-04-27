describe("DummyDropdown", function() {

   describe("Collection", function() {
      it("при инициализации находит все select", function() {
         var dd_collection = new DummyDropdown('select');
         expect(dd_collection.dropdowns).to.have.length(1);
      });

      it("умеет принимать настройки", function() {
         var dd_collection = new DummyDropdown('select',
            {multiselect: true, combobox: true});

         expect(dd_collection._options.multiselect).to.eql(true);
         expect(dd_collection._options.combobox).to.eql(true);
      });

      it("игнорирует незнакомые настройки", function() {
         var dd_collection = new DummyDropdown('select',
            {abracadabra: true});

         expect(dd_collection._options.abracadabra).not.to.eql(true);
      });
   });

   describe("One", function() {

      it("при инициализации находит все option", function() {
         var dd = new DummyDropdown('select').get();
         expect(dd._state.items).to.have.length(2);
      });

   });
});
